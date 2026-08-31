import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gitApi, toGitErrorMessage } from "@/api/git";
import type { RepositoryTreeResponse } from "@/api/repository";
import { injectCaptureAssets } from "@/preview-capture/injectCaptureAssets";
import type { SnapshotCaptureStatus } from "@/preview-capture/types";
import { acquireWebContainer, teardownWebContainer } from "@/utils/webContainerRuntime";
import { mountOrSyncWorkspace, writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { getOrStartWorkspaceWarmup, invalidateWorkspaceWarmup } from "@/utils/workspaceWarmup";
import {
  MAX_PREVIEW_FILE_BYTES,
  PRELOAD_BATCH_SIZE,
  PREVIEW_PORT,
  PREVIEW_SYNC_DEBOUNCE_MS,
  SERVER_READY_TIMEOUT_MS,
  BUNDLER_SERVER_READY_TIMEOUT_MS,
  NPM_INSTALL_TIMEOUT_MS,
} from "./constants";
import type {
  LoadDiagnostics,
  LoadedFile,
  PreviewStatus,
  RepositoryWorkspaceViewProps,
} from "./types";
import {
  resolvePreviewProject,
  type PreviewProjectProfile,
  type PreviewRuntimeKind,
} from "./previewProject";
import {
  createDesignRuntimeScript,
  injectDesignRuntimeIntoHtml,
} from "../RepositoryWorkspace/designRuntime";
import {
  applyInlineStyleToSource,
  instrumentHtmlForDesign,
} from "../RepositoryWorkspace/designWriteback";
import {
  buildFileSystemTree,
  buildTree,
  createStaticServerScript,
  createRepositoryFallbackHtml,
  createRuntimeFailureHtml,
  fetchRepositoryFileWithTimeout,
  findPreviewEntryPath,
  formatDuration,
  ensurePreviewFilesLoaded,
  runBatched,
  selectInitialActivePath,
  isPreviewAffectingPath,
  toDisplayError,
  normalizeRepositoryUrl,
  consumeTerminalOutput,
  flushTerminalBuffer,
  withTimeout,
  ensurePackageJsonDiscovery,
  preloadRepositoryPaths,
  getBundlerPreloadPaths,
  getBundlerBackgroundPaths,
  toWorkspaceFileContent,
} from "./utils";

/**
 * iframe에서 서빙할 HTML을 준비한다.
 * - instrumentHtmlForDesign: 요소를 코드로 되돌려 쓰기 위한 data-codee-id 앵커를 심는다.
 * - injectDesignRuntimeIntoHtml: 선택/실시간 스타일 적용용 런타임 스크립트를 주입한다.
 * (사용자가 편집기에서 보는 원본 소스에는 절대 적용하지 않는다 — 서빙 사본에만 적용)
 */
function prepareServedHtml(source: string, instrument: boolean): string {
  return injectDesignRuntimeIntoHtml(instrument ? instrumentHtmlForDesign(source) : source);
}

function withDesignRuntimeFiles(
  files: Record<string, LoadedFile>,
  workspaceRoot?: string,
): Record<string, LoadedFile> {
  const isStatic = workspaceRoot === undefined;
  const normalizedRoot = workspaceRoot ? workspaceRoot.replace(/\/+$/, "") : "";
  const prefix = normalizedRoot ? `${normalizedRoot}/` : "";
  const runtimePath = normalizedRoot
    ? `${prefix}public/codee-design-runtime.js`
    : "codee-design-runtime.js";
  const indexPath = `${prefix}index.html`;
  const nextFiles: Record<string, LoadedFile> = {
    ...files,
    [runtimePath]: {
      path: runtimePath,
      content: createDesignRuntimeScript(),
      dirty: false,
    },
  };

  const indexFile = nextFiles[indexPath];
  if (indexFile && indexFile.encoding !== "base64") {
    nextFiles[indexPath] = {
      ...indexFile,
      content: prepareServedHtml(indexFile.content, isStatic),
    };
  }

  return nextFiles;
}
const INITIAL_DIAGNOSTICS: LoadDiagnostics = {
  treeMs: null,
  coreMs: null,
  runtimeMs: null,
  backgroundMs: null,
  coreFailedPaths: [],
  backgroundFailedPaths: [],
  lastError: null,
};

interface UseRepositoryWorkspaceOptions {
  onServerFileSynced?: () => void | Promise<void>;
}

export function useRepositoryWorkspace(
  options: UseRepositoryWorkspaceOptions = {},
): RepositoryWorkspaceViewProps {
  const { onServerFileSynced } = options;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositoryUrl = normalizeRepositoryUrl(searchParams.get("repo") ?? "");
  const branchName = searchParams.get("branch") ?? "";

  const [tree, setTree] = useState<RepositoryTreeResponse | null>(null);
  const [filesByPath, setFilesByPath] = useState<Record<string, LoadedFile>>({});
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("저장소를 준비하는 중입니다.");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncatedCount, setTruncatedCount] = useState(0);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<LoadDiagnostics>(INITIAL_DIAGNOSTICS);

  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewProjectLabel, setPreviewProjectLabel] = useState("정적 HTML");
  const [runtimeLog, setRuntimeLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [snapshotCaptureStatus, setSnapshotCaptureStatus] = useState<SnapshotCaptureStatus>("idle");
  const [analysisResultId, setAnalysisResultId] = useState<number | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [designWriteEnabled, setDesignWriteEnabled] = useState(false);

  const webContainerRef = useRef<WebContainer | null>(null);
  const runtimeProcessRef = useRef<WebContainerProcess | null>(null);
  const outputPumpAbortRef = useRef<AbortController | null>(null);
  const pendingWriteTimersRef = useRef<Map<string, number>>(new Map());
  const loadSessionIdRef = useRef(0);
  const serverReadySubscribedRef = useRef(false);
  const previewReadyRef = useRef(false);
  const serverReadyTimeoutRef = useRef<number | null>(null);
  const activeWriteTasksRef = useRef<Map<string, Promise<void>>>(new Map());
  const runtimeGenerationRef = useRef(0);
  const previewEntryPathRef = useRef<string | null>(null);
  const previewRuntimeKindRef = useRef<PreviewRuntimeKind>("static");
  const runtimeStartInFlightRef = useRef<Promise<void> | null>(null);
  const previewRuntimeTokenRef = useRef(0);
  const installProcessRef = useRef<WebContainerProcess | null>(null);
  const captureAttemptedRef = useRef(false);

  const activeFile = useMemo(() => {
    if (!activePath) return null;
    return filesByPath[activePath] ?? null;
  }, [activePath, filesByPath]);

  const treeItems = useMemo(() => buildTree(Object.keys(filesByPath)), [filesByPath]);

  const filesByPathRef = useRef(filesByPath);
  useEffect(() => {
    filesByPathRef.current = filesByPath;
  }, [filesByPath]);

  const appendRuntimeLog = useCallback((line: string) => {
    setRuntimeLog((prev) => {
      const next = [...prev, line];
      if (next.length > 300) {
        return next.slice(next.length - 300);
      }
      return next;
    });
  }, []);

  const syncFileToGitWorkspace = useCallback(
    async (path: string, content: string) => {
      if (!repositoryUrl || !branchName) return;

      const response = await gitApi.writeFile({
        repositoryUrl,
        branchName,
        path,
        content,
      });

      if (!response.success) {
        throw new Error(`${path} 파일을 Git 작업공간에 저장하지 못했습니다.`);
      }

      setFilesByPath((prev) => {
        const current = prev[path];
        if (!current || current.content !== content) return prev;
        return {
          ...prev,
          [path]: {
            ...current,
            dirty: false,
          },
        };
      });

      await onServerFileSynced?.();
    },
    [branchName, onServerFileSynced, repositoryUrl],
  );

  const logEvent = useCallback(
    (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const line = `[${timestamp}] ${message}`;
      appendRuntimeLog(line);
      console.info("[RepositoryWorkspace]", line);
    },
    [appendRuntimeLog],
  );

  const stopRuntimeProcess = useCallback(async () => {
    outputPumpAbortRef.current?.abort();
    outputPumpAbortRef.current = null;
    runtimeGenerationRef.current += 1;
    previewRuntimeTokenRef.current += 1;
    if (installProcessRef.current) {
      installProcessRef.current.kill();
      installProcessRef.current = null;
    }
    if (runtimeProcessRef.current) {
      runtimeProcessRef.current.kill();
      runtimeProcessRef.current = null;
    }
  }, []);

  const resetPreviewRuntimeSession = useCallback(() => {
    previewReadyRef.current = false;
    serverReadySubscribedRef.current = false;
    if (serverReadyTimeoutRef.current) {
      window.clearTimeout(serverReadyTimeoutRef.current);
      serverReadyTimeoutRef.current = null;
    }
    webContainerRef.current = null;
  }, []);

  const attachProcessOutputPump = useCallback(
    (process: WebContainerProcess, _generation: number, reportExitError: boolean = true) => {
      const reader = process.output.getReader();
      const abortController = new AbortController();
      outputPumpAbortRef.current = abortController;
      void (async () => {
        let lineBuffer = "";
        while (true) {
          if (abortController.signal.aborted) return;
          const { done, value } = await reader.read();
          if (done) {
            const flushed = flushTerminalBuffer(lineBuffer);
            if (flushed) appendRuntimeLog(flushed);
            return;
          }
          if (!value) continue;

          const { lines, buffer } = consumeTerminalOutput(value, lineBuffer);
          lineBuffer = buffer;
          lines.forEach((line) => appendRuntimeLog(line));
        }
      })();

      void process.exit.then((exitCode) => {
        if (!reportExitError) return;
        if (runtimeProcessRef.current !== process) return;
        if (exitCode === 0 || exitCode === 143 || exitCode === 137) return;
        const message = `프리뷰 프로세스가 종료되었습니다. (exit: ${exitCode})`;
        setPreviewStatus("error");
        setRuntimeError(message);
        logEvent(message);
      });
    },
    [appendRuntimeLog, logEvent],
  );

  const subscribeServerReady = useCallback(
    (container: WebContainer, timeoutMs: number) => {
      if (!serverReadySubscribedRef.current) {
        container.on("server-ready", (port, url) => {
          if (previewReadyRef.current) return;
          previewReadyRef.current = true;
          if (serverReadyTimeoutRef.current) {
            window.clearTimeout(serverReadyTimeoutRef.current);
            serverReadyTimeoutRef.current = null;
          }
          setRuntimeError(null);
          setPreviewUrl(url.endsWith("/") ? url : `${url}/`);
          setPreviewStatus("ready");
          logEvent(`server-ready 수신 (port ${port}): ${url}`);
        });
        serverReadySubscribedRef.current = true;
      }

      if (serverReadyTimeoutRef.current) {
        window.clearTimeout(serverReadyTimeoutRef.current);
      }
      serverReadyTimeoutRef.current = window.setTimeout(() => {
        if (!previewReadyRef.current) {
          logEvent(
            `server-ready 이벤트가 ${timeoutMs / 1000}초 내 오지 않았습니다. 런타임 로그를 확인해 주세요.`,
          );
        }
        serverReadyTimeoutRef.current = null;
      }, timeoutMs);
    },
    [logEvent],
  );

  const startBundlerRuntime = useCallback(
    async (container: WebContainer, profile: PreviewProjectProfile) => {
      previewRuntimeKindRef.current = "bundler";
      previewEntryPathRef.current = null;
      setDesignWriteEnabled(false);
      logEvent(`${profile.label} 개발 서버 준비 중`);

      await stopRuntimeProcess();

      const installEnv = {
        CI: "true",
        NPM_CONFIG_PROGRESS: "false",
        PNPM_IGNORE_ENGINES: "true",
      };

      let installSucceeded = false;
      for (const installCommand of profile.installCommands) {
        appendRuntimeLog(`의존성 설치 중 (${installCommand.join(" ")})...`);
        logEvent(`의존성 설치 시도: ${installCommand.join(" ")}`);
        const installGeneration = runtimeGenerationRef.current + 1;
        runtimeGenerationRef.current = installGeneration;
        const installProcess = await container.spawn(installCommand[0], installCommand.slice(1), {
          env: installEnv,
        });
        installProcessRef.current = installProcess;
        attachProcessOutputPump(installProcess, installGeneration, false);
        const installExitCode = await withTimeout(
          installProcess.exit,
          NPM_INSTALL_TIMEOUT_MS,
          `의존성 설치 타임아웃(${NPM_INSTALL_TIMEOUT_MS / 60000}분). 네트워크 상태를 확인한 뒤 프리뷰를 재시작해 주세요.`,
        );
        installProcessRef.current = null;
        if (installExitCode === 0) {
          installSucceeded = true;
          break;
        }
        logEvent(`의존성 설치 실패 (exit: ${installExitCode}): ${installCommand.join(" ")}`);
      }

      if (!installSucceeded) {
        throw new Error("의존성 설치에 실패했습니다. 로그의 설치 오류 메시지를 확인해 주세요.");
      }
      logEvent("의존성 설치 완료");

      const devCwd = profile.workspaceRoot || undefined;
      if (devCwd) {
        logEvent(`개발 서버 작업 디렉터리: ${devCwd}`);
      }

      appendRuntimeLog("개발 서버 실행 중...");
      const devCommands = [profile.devCommand, ...profile.devCommandFallbacks];
      let devStarted = false;

      for (let index = 0; index < devCommands.length; index++) {
        const devCommand = devCommands[index];
        if (index > 0) {
          await stopRuntimeProcess();
        }
        const devGeneration = runtimeGenerationRef.current + 1;
        runtimeGenerationRef.current = devGeneration;

        logEvent(`개발 서버 시도: ${devCommand.join(" ")}`);
        const devProcess = await container.spawn(devCommand[0], devCommand.slice(1), {
          cwd: devCwd,
          env: { CI: "true", ...profile.devEnv },
        });
        runtimeProcessRef.current = devProcess;
        attachProcessOutputPump(devProcess, devGeneration);

        const earlyExit = await Promise.race([
          devProcess.exit.then((code) => ({ type: "exit" as const, code })),
          new Promise<{ type: "timeout" }>((resolve) => {
            window.setTimeout(() => resolve({ type: "timeout" }), 8000);
          }),
        ]);

        if (earlyExit.type === "timeout") {
          devStarted = true;
          logEvent(`개발 서버 프로세스 시작 (${devCommand.join(" ")})`);
          break;
        }

        if (earlyExit.code === 0 || earlyExit.code === 143 || earlyExit.code === 137) {
          devStarted = true;
          logEvent(`개발 서버 프로세스 시작 (${devCommand.join(" ")})`);
          break;
        }

        logEvent(`개발 서버 시작 실패 (exit: ${earlyExit.code}): ${devCommand.join(" ")}`);
        runtimeProcessRef.current = null;
      }

      if (!devStarted) {
        throw new Error(
          "개발 서버를 시작하지 못했습니다. 로그의 Next.js 오류 메시지를 확인해 주세요.",
        );
      }
    },
    [appendRuntimeLog, attachProcessOutputPump, logEvent, stopRuntimeProcess],
  );

  const startStaticRuntime = useCallback(
    async (container: WebContainer, files: Record<string, LoadedFile>) => {
      previewRuntimeKindRef.current = "static";
      setDesignWriteEnabled(true);

      let entryPath = findPreviewEntryPath(files);
      if (!entryPath) {
        const fallbackHtml = prepareServedHtml(
          createRepositoryFallbackHtml(repositoryUrl, branchName, files),
          true,
        );
        await writeWorkspaceFile(container, "index.html", fallbackHtml);
        entryPath = "index.html";
        logEvent("프론트 진입 파일이 없어 저장소 안내 프리뷰를 생성했습니다.");
      }
      if (entryPath !== "index.html" && entryPath !== "index.htm") {
        await writeWorkspaceFile(
          container,
          "index.html",
          prepareServedHtml(files[entryPath].content, true),
        );
        logEvent(`프리뷰 진입점: ${entryPath} → index.html`);
      } else {
        logEvent(`프리뷰 진입점: ${entryPath}`);
      }
      previewEntryPathRef.current = entryPath;

      await stopRuntimeProcess();

      appendRuntimeLog("정적 프리뷰 서버 실행 중...");
      await writeWorkspaceFile(
        container,
        ".cursor-preview-static-server.mjs",
        createStaticServerScript(),
      );
      const generation = runtimeGenerationRef.current + 1;
      runtimeGenerationRef.current = generation;
      const process = await container.spawn("node", [".cursor-preview-static-server.mjs"], {
        env: {
          PORT: String(PREVIEW_PORT),
        },
      });
      runtimeProcessRef.current = process;
      logEvent("정적 서버 프로세스 시작");
      attachProcessOutputPump(process, generation);
    },
    [appendRuntimeLog, attachProcessOutputPump, branchName, logEvent, repositoryUrl, stopRuntimeProcess],
  );

  const startRuntime = useCallback(
    async (files: Record<string, LoadedFile>) => {
      if (runtimeStartInFlightRef.current) {
        logEvent("진행 중인 프리뷰 런타임 시작을 재사용합니다.");
        return runtimeStartInFlightRef.current;
      }

      const run = async () => {
        const runtimeToken = ++previewRuntimeTokenRef.current;
        const fileCount = Object.keys(files).length;

        setPreviewStatus("loading");
        previewReadyRef.current = false;
        captureAttemptedRef.current = false;
        setSnapshotCaptureStatus("idle");
        setAnalysisResultId(null);
        setPreviewRevision(0);
        setRuntimeError(null);
        setPreviewUrl("");

        if (fileCount === 0) {
          throw new Error(
            "저장소 파일이 로드되지 않았습니다. 분석 페이지부터 다시 진행하거나 API 서버 상태를 확인해 주세요.",
          );
        }

        appendRuntimeLog("=== 프리뷰 런타임 ===");

        const projectProfile = resolvePreviewProject(files);
        const runtimeFiles = withDesignRuntimeFiles(
          files,
          projectProfile.kind === "bundler" ? projectProfile.workspaceRoot : undefined,
        );
        const isBundler = projectProfile.kind === "bundler";
        setPreviewProjectLabel(projectProfile.label);
        logEvent(
          isBundler ? `${projectProfile.label} 프리뷰 런타임 시작` : "정적 프리뷰 런타임 시작",
        );
        if (isBundler) {
          logEvent(`설치: ${projectProfile.installCommands[0]?.join(" ") ?? "-"}`);
          logEvent(`실행: ${projectProfile.devCommand.join(" ")}`);
          if (projectProfile.workspaceRoot) {
            logEvent(`작업 디렉터리: ${projectProfile.workspaceRoot}`);
          }
        }

        logEvent("WebContainer 인스턴스 확보 중...");
        const container = await acquireWebContainer();
        if (runtimeToken !== previewRuntimeTokenRef.current) return;
        webContainerRef.current = container;
        logEvent("WebContainer 인스턴스 확보 완료");

        const fsTree = buildFileSystemTree(runtimeFiles);
        const flatFiles = Object.fromEntries(
          Object.entries(runtimeFiles).map(([path, file]) => [path, toWorkspaceFileContent(file)]),
        );
        logEvent(`파일 시스템 준비 중 (${Object.keys(files).length}개)...`);
        const mountMode = await mountOrSyncWorkspace(container, fsTree, flatFiles);
        if (runtimeToken !== previewRuntimeTokenRef.current) return;
        logEvent(
          mountMode === "mounted"
            ? `WebContainer 최초 마운트 완료 (파일 ${Object.keys(files).length}개)`
            : `WebContainer 파일 동기화 완료 (파일 ${Object.keys(files).length}개)`,
        );

        const injected = await injectCaptureAssets(container, projectProfile, files);
        if (runtimeToken !== previewRuntimeTokenRef.current) return;
        logEvent(
          `스냅샷 캡처 에셋 주입 완료 (host: ${injected.captureHostPath}, html: ${
            injected.patchedHtmlPaths.join(", ") || "없음"
          })`,
        );
        if (isBundler && injected.patchedHtmlPaths.length === 0) {
          logEvent(
            "경고: React/번들러 HTML 엔트리에 캡처 브리지를 넣지 못했습니다. index.html 또는 public/index.html 을 확인하세요.",
          );
        }

        const serverReadyTimeoutMs = isBundler
          ? BUNDLER_SERVER_READY_TIMEOUT_MS
          : SERVER_READY_TIMEOUT_MS;
        subscribeServerReady(container, serverReadyTimeoutMs);

        if (isBundler) {
          try {
            await startBundlerRuntime(container, projectProfile);
          } catch (error) {
            const message = toDisplayError(error);
            logEvent(`번들러 프리뷰 실패, 안내 화면으로 전환: ${message}`);
            const fallbackFile = {
              path: "index.html",
              content: createRuntimeFailureHtml(repositoryUrl, branchName, message),
              dirty: false,
            };
            await startStaticRuntime(container, { ...runtimeFiles, "index.html": fallbackFile });
          }
        } else {
          await startStaticRuntime(container, runtimeFiles);
        }
      };

      const task = run().finally(() => {
        if (runtimeStartInFlightRef.current === task) {
          runtimeStartInFlightRef.current = null;
        }
      });
      runtimeStartInFlightRef.current = task;
      return task;
    },
    [
      appendRuntimeLog,
      branchName,
      logEvent,
      repositoryUrl,
      startBundlerRuntime,
      startStaticRuntime,
      subscribeServerReady,
    ],
  );

  const startRuntimeRef = useRef(startRuntime);
  startRuntimeRef.current = startRuntime;

  const loadSingleFile = useCallback(
    async (path: string) => {
      if (!repositoryUrl) return;
      if (filesByPath[path]) return;

      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path, branchName);
      setFilesByPath((prev) => ({
        ...prev,
        [path]: {
          path,
          content: response.content,
          encoding: response.encoding,
          dirty: false,
        },
      }));
      const container = webContainerRef.current;
      if (container) {
        await writeWorkspaceFile(
          container,
          path,
          response.encoding === "base64"
            ? toWorkspaceFileContent({ content: response.content, encoding: response.encoding })
            : response.content,
        );
      }
      logEvent(`지연 로드 완료: ${path}`);
    },
    [filesByPath, logEvent, repositoryUrl, branchName],
  );

  const handleFileClick = useCallback(
    async (path: string) => {
      if (!openPaths.includes(path)) {
        setOpenPaths((prev) => [...prev, path]);
      }
      setActivePath(path);
      if (!filesByPath[path]) {
        try {
          await loadSingleFile(path);
        } catch (error) {
          setLoadError(`파일을 불러오지 못했습니다: ${toDisplayError(error)}`);
        }
      }
    },
    [filesByPath, loadSingleFile, openPaths],
  );

  const closeTab = useCallback((path: string) => {
    setOpenPaths((prev) => {
      const next = prev.filter((item) => item !== path);
      setActivePath((currentActive) => {
        if (currentActive !== path) return currentActive;
        if (!next.length) return null;
        return next[next.length - 1];
      });
      return next;
    });
  }, []);

  const syncFileToPreviewRuntime = useCallback(async (path: string, content: string) => {
    const container = webContainerRef.current;
    if (!container) return;

    if (previewRuntimeKindRef.current === "bundler") {
      await writeWorkspaceFile(container, path, content);
      return;
    }

    const entryPath = previewEntryPathRef.current;
    const isEntry = path === entryPath;

    if (isEntry) {
      // 진입 파일 편집: 서빙용 index.html 에 앵커(data-codee-id) + 런타임을 다시 주입한다.
      await writeWorkspaceFile(container, "index.html", prepareServedHtml(content, true));
      if (entryPath && entryPath !== "index.html" && entryPath !== "index.htm") {
        await writeWorkspaceFile(container, entryPath, content);
      }
    } else {
      await writeWorkspaceFile(container, path, content);
    }

    if (isPreviewAffectingPath(path, "static") || isEntry) {
      setPreviewRevision((revision) => revision + 1);
    }
  }, []);

  const syncEditedFile = useCallback(
    async (path: string, content: string) => {
      const task = (async () => {
        await syncFileToPreviewRuntime(path, content);
        await syncFileToGitWorkspace(path, content);
      })();

      activeWriteTasksRef.current.set(path, task);
      try {
        await task;
      } finally {
        if (activeWriteTasksRef.current.get(path) === task) {
          activeWriteTasksRef.current.delete(path);
        }
      }
    },
    [syncFileToGitWorkspace, syncFileToPreviewRuntime],
  );

  const flushPendingWrites = useCallback(async () => {
    const pendingPaths = Array.from(pendingWriteTimersRef.current.keys());
    pendingPaths.forEach((path) => {
      const timerId = pendingWriteTimersRef.current.get(path);
      if (timerId) {
        window.clearTimeout(timerId);
      }
      pendingWriteTimersRef.current.delete(path);
    });

    const dirtyFiles = Object.values(filesByPathRef.current).filter(
      (file) => file.dirty && file.encoding !== "base64",
    );

    await Promise.all([
      ...Array.from(activeWriteTasksRef.current.values()),
      ...dirtyFiles.map((file) => syncEditedFile(file.path, file.content)),
    ]);
  }, [syncEditedFile]);

  const handleEditorChange = useCallback(
    (nextValue: string | undefined) => {
      if (!activePath || nextValue === undefined) return;

      setFilesByPath((prev) => {
        const currentFile = prev[activePath];
        if (!currentFile) return prev;
        if (currentFile.content === nextValue) return prev;
        return {
          ...prev,
          [activePath]: {
            ...currentFile,
            content: nextValue,
            dirty: true,
          },
        };
      });

      const currentTimer = pendingWriteTimersRef.current.get(activePath);
      if (currentTimer) {
        window.clearTimeout(currentTimer);
      }

      const timerId = window.setTimeout(async () => {
        pendingWriteTimersRef.current.delete(activePath);
        try {
          await syncEditedFile(activePath, nextValue);
        } catch (error) {
          const message = toGitErrorMessage(
            error,
            `실시간 반영 중 오류가 발생했습니다: ${toDisplayError(error)}`,
          );
          setRuntimeError(message);
        }
      }, PREVIEW_SYNC_DEBOUNCE_MS);

      pendingWriteTimersRef.current.set(activePath, timerId);
    },
    [activePath, syncEditedFile],
  );

  const applyDesignToCode = useCallback((sourceId: number | null, css: Record<string, string>) => {
    // 정적 HTML 프리뷰에서만 소스 코드에 되돌려 쓸 수 있다.
    if (previewRuntimeKindRef.current !== "static") return;
    if (sourceId == null) return;
    const entryPath = previewEntryPathRef.current;
    if (!entryPath) return;

    const entryFile = filesByPathRef.current[entryPath];
    if (!entryFile || entryFile.encoding === "base64") return;

    const patched = applyInlineStyleToSource(entryFile.content, sourceId, css);
    if (patched == null || patched === entryFile.content) return;

    setFilesByPath((prev) => {
      const current = prev[entryPath];
      if (!current) return prev;
      return {
        ...prev,
        [entryPath]: { ...current, content: patched, dirty: true },
      };
    });

    // 디자인 변경이 반영된 소스 파일을 에디터에 노출한다.
    // 아직 안 열려 있으면 탭을 열고 활성화해 "코드가 함께 바뀌는" 것을 바로 보여준다.
    // 이미 열려 있다면 사용자의 현재 탭 선택을 존중한다(초점을 빼앗지 않음).
    setOpenPaths((prev) => {
      if (prev.includes(entryPath)) return prev;
      setActivePath(entryPath);
      return [...prev, entryPath];
    });

    // 서빙 사본(index.html)도 조용히 갱신 → 새로고침해도 변경이 유지된다. (리로드는 유발하지 않음)
    const container = webContainerRef.current;
    if (container) {
      void writeWorkspaceFile(container, "index.html", prepareServedHtml(patched, true)).catch(
        () => {
          /* 서빙 사본 동기화 실패는 실시간 프리뷰(postMessage)에 영향 없음 */
        },
      );
    }
    void syncFileToGitWorkspace(entryPath, patched).catch((error) => {
      setRuntimeError(
        toGitErrorMessage(
          error,
          `디자인 변경을 Git 작업공간에 저장하지 못했습니다: ${toDisplayError(error)}`,
        ),
      );
    });
  }, [syncFileToGitWorkspace]);

  const handleRestartPreview = useCallback(async () => {
    if (!Object.keys(filesByPath).length) return;
    setIsRestarting(true);
    setRuntimeError(null);
    setRuntimeLog([]);
    captureAttemptedRef.current = false;
    setSnapshotCaptureStatus("idle");
    setAnalysisResultId(null);
    try {
      logEvent("프리뷰 재시작: 실행 중인 프로세스 종료 중...");
      await stopRuntimeProcess();
      resetPreviewRuntimeSession();
      logEvent("프리뷰 재시작: WebContainer 인스턴스 종료 중...");
      await teardownWebContainer();
      await startRuntime(filesByPath);
    } catch (error) {
      setPreviewStatus("error");
      setRuntimeError(toDisplayError(error));
    } finally {
      setIsRestarting(false);
    }
  }, [filesByPath, logEvent, resetPreviewRuntimeSession, startRuntime, stopRuntimeProcess]);

  useEffect(() => {
    if (!repositoryUrl) {
      setLoadError("저장소 URL이 없어 연결 페이지로 돌아갑니다.");
      return;
    }

    const loadWorkspace = async () => {
      setLoadingMessage("저장소 트리를 불러오는 중...");
      const sessionId = Date.now();
      loadSessionIdRef.current = sessionId;
      logEvent(`워크스페이스 로드 시작: ${repositoryUrl}`);
      setDiagnostics(INITIAL_DIAGNOSTICS);

      try {
        logEvent("WebContainer 사전 부팅 시작");
        const bootPromise = acquireWebContainer();
        const warmupStart = Date.now();
        const warmed = await getOrStartWorkspaceWarmup(repositoryUrl, branchName);
        if (Object.keys(warmed.files).length === 0) {
          invalidateWorkspaceWarmup(repositoryUrl, branchName);
          throw new Error(
            "저장소 파일을 불러오지 못했습니다. 백엔드 API가 실행 중인지 확인한 뒤, 연결 페이지에서 다시 시도해 주세요.",
          );
        }
        const treeMs = Date.now() - warmupStart;
        setTree(warmed.tree);
        logEvent(`사전 워밍업 데이터 확보 완료 (${formatDuration(treeMs)})`);
        setDiagnostics((prev) => ({ ...prev, treeMs }));

        setLoadingMessage("프리뷰용 핵심 파일을 불러오는 중...");
        const loaded = {
          ...warmed,
          files: Object.fromEntries(
            Object.entries(warmed.files).map(([path, file]) => [
              path,
              {
                path: file.path,
                content: file.content,
                encoding: file.encoding,
                dirty: false,
              },
            ]),
          ),
        };
        if (loadSessionIdRef.current !== sessionId) return;
        const coreMs = Date.now() - warmupStart;
        logEvent(
          `핵심 파일 로드 완료 (${formatDuration(coreMs)}), 성공 ${Object.keys(loaded.files).length}개, 실패 ${loaded.coreFailedPaths.length}개`,
        );
        if (loaded.skippedLargePaths.length > 0) {
          logEvent(
            `대용량 파일 ${loaded.skippedLargePaths.length}개는 초기 프리뷰에서 제외 (>${Math.floor(MAX_PREVIEW_FILE_BYTES / 1024)}KB)`,
          );
        }
        setFilesByPath(loaded.files);
        setTruncatedCount(loaded.truncatedCount);
        const loadableCorePaths = loaded.corePaths.filter((path) => Boolean(loaded.files[path]));
        const nextActive = selectInitialActivePath(loadableCorePaths);
        if (nextActive) {
          setOpenPaths([nextActive]);
          setActivePath(nextActive);
        }
        setDiagnostics((prev) => ({
          ...prev,
          coreMs,
          coreFailedPaths: loaded.coreFailedPaths,
        }));

        setLoadingMessage("프리뷰 런타임을 준비하는 중...");
        const runtimeStart = Date.now();
        logEvent("WebContainer 부팅 완료 대기 중...");
        await bootPromise;
        logEvent("WebContainer 부팅 완료");
        const allTreePaths = warmed.tree.nodes
          .filter((node) => node.type === "blob")
          .map((node) => node.path);
        const allPaths = [...loaded.corePaths, ...loaded.deferredPaths];
        let previewFiles = await ensurePreviewFilesLoaded(
          loaded.files,
          allPaths,
          repositoryUrl,
          branchName,
        );
        previewFiles = await ensurePackageJsonDiscovery(
          previewFiles,
          allTreePaths,
          repositoryUrl,
          branchName,
        );

        const bundlerProfile = resolvePreviewProject(previewFiles);
        let bundlerBackgroundPaths: string[] = [];
        if (bundlerProfile.kind === "bundler") {
          const preloadPaths = getBundlerPreloadPaths(
            bundlerProfile.workspaceRoot,
            loaded.deferredPaths,
            allTreePaths,
          );
          const missingCount = preloadPaths.filter((path) => !previewFiles[path]).length;
          if (missingCount > 0) {
            logEvent(`번들러 핵심 소스 로드 중 (${missingCount}개, registry 제외)...`);
            previewFiles = await preloadRepositoryPaths(
              previewFiles,
              preloadPaths,
              repositoryUrl,
              branchName,
            );
            logEvent(`번들러 핵심 소스 로드 완료 (총 ${Object.keys(previewFiles).length}개)`);
          }
          bundlerBackgroundPaths = getBundlerBackgroundPaths(
            bundlerProfile.workspaceRoot,
            loaded.deferredPaths,
            allTreePaths,
            new Set(Object.keys(previewFiles)),
          );
        }

        if (Object.keys(previewFiles).length > Object.keys(loaded.files).length) {
          setFilesByPath((prev) => ({ ...prev, ...previewFiles }));
        }
        await startRuntimeRef.current(previewFiles);
        const runtimeMs = Date.now() - runtimeStart;
        logEvent(`프리뷰 런타임 준비 완료 (${formatDuration(runtimeMs)})`);
        setDiagnostics((prev) => ({ ...prev, runtimeMs }));

        const backgroundPaths =
          bundlerProfile.kind === "bundler" ? bundlerBackgroundPaths : loaded.deferredPaths;

        if (backgroundPaths.length > 0) {
          setIsBackgroundLoading(true);
          setLoadingMessage(
            bundlerProfile.kind === "bundler"
              ? "registry 등 나머지 파일을 백그라운드에서 불러오는 중..."
              : "나머지 파일을 백그라운드에서 불러오는 중...",
          );
          const backgroundFailedPaths: string[] = [];
          const bgStart = Date.now();
          await runBatched(
            backgroundPaths,
            async (path) => {
              if (loadSessionIdRef.current !== sessionId) return;
              let response;
              try {
                response = await fetchRepositoryFileWithTimeout(repositoryUrl, path, branchName);
              } catch (error) {
                backgroundFailedPaths.push(path);
                logEvent(`백그라운드 파일 로드 실패: ${path} (${toDisplayError(error)})`);
                return;
              }
              setFilesByPath((prev) => {
                const existing = prev[path];
                if (existing?.dirty) return prev;
                if (existing && existing.content === response.content) return prev;
                return {
                  ...prev,
                  [path]: {
                    path,
                    content: response.content,
                    encoding: response.encoding,
                    dirty: existing?.dirty ?? false,
                  },
                };
              });

              const container = webContainerRef.current;
              if (!container) return;

              try {
                await writeWorkspaceFile(
                  container,
                  path,
                  response.encoding === "base64"
                    ? toWorkspaceFileContent({
                        content: response.content,
                        encoding: response.encoding,
                      })
                    : response.content,
                );
              } catch (error) {
                backgroundFailedPaths.push(path);
                logEvent(`백그라운드 WebContainer 동기화 실패: ${path} (${toDisplayError(error)})`);
              }
            },
            PRELOAD_BATCH_SIZE,
          );
          if (loadSessionIdRef.current === sessionId) {
            const backgroundMs = Date.now() - bgStart;
            logEvent(
              `백그라운드 로드 완료 (${formatDuration(backgroundMs)}), 실패 ${backgroundFailedPaths.length}개`,
            );
            setIsBackgroundLoading(false);
            setDiagnostics((prev) => ({
              ...prev,
              backgroundMs,
              backgroundFailedPaths,
            }));
          }
        }
      } catch (error) {
        setIsBackgroundLoading(false);
        const errorMessage = toDisplayError(error);
        logEvent(`워크스페이스 로드 실패: ${errorMessage}`);
        setLoadError(errorMessage);
        setDiagnostics((prev) => ({ ...prev, lastError: errorMessage }));
      }
    };

    void loadWorkspace();
    return () => {
      loadSessionIdRef.current = 0;
    };
  }, [repositoryUrl, branchName, logEvent]);

  useEffect(() => {
    const pendingTimers = pendingWriteTimersRef.current;
    return () => {
      loadSessionIdRef.current = 0;
      previewReadyRef.current = false;
      serverReadySubscribedRef.current = false;
      if (serverReadyTimeoutRef.current) {
        window.clearTimeout(serverReadyTimeoutRef.current);
        serverReadyTimeoutRef.current = null;
      }
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.clear();
      void (async () => {
        await stopRuntimeProcess();
        await teardownWebContainer();
      })();
    };
  }, [stopRuntimeProcess]);

  return {
    repositoryUrl,
    branchName,
    tree,
    filesByPath,
    openPaths,
    activePath,
    activeFile,
    treeItems,
    loadingMessage,
    loadError,
    truncatedCount,
    isBackgroundLoading,
    diagnostics,
    previewStatus,
    previewUrl,
    previewRevision,
    previewProjectLabel,
    runtimeLog,
    runtimeError,
    snapshotCaptureStatus,
    analysisResultId,
    isRestarting,
    designWriteEnabled,
    onFileClick: handleFileClick,
    onCloseTab: closeTab,
    onEditorChange: handleEditorChange,
    onFlushPendingWrites: flushPendingWrites,
    onRestartPreview: handleRestartPreview,
    onDesignPatch: applyDesignToCode,
    onNavigateToConnect: () => navigate("/repository-connect"),
  };
}
