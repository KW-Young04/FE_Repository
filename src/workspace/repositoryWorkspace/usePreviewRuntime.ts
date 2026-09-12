import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { injectCaptureAssets } from "@/preview-capture/injectCaptureAssets";
import type { SnapshotCaptureStatus } from "@/preview-capture/types";
import { acquireWebContainer, teardownWebContainer } from "@/utils/webContainerRuntime";
import { mountOrSyncWorkspace, writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import {
  PREVIEW_PORT,
  SERVER_READY_TIMEOUT_MS,
  BUNDLER_SERVER_READY_TIMEOUT_MS,
  NPM_INSTALL_TIMEOUT_MS,
} from "../constants";
import type { LoadedFile, PreviewStatus } from "../types";
import {
  resolvePreviewProject,
  type PreviewProjectProfile,
  type PreviewRuntimeKind,
  withPreviewDependencyFixes,
} from "../previewProject";
import {
  buildFileSystemTree,
  createStaticServerScript,
  createRepositoryFallbackHtml,
  createRuntimeFailureHtml,
  findPreviewEntryPath,
  consumeTerminalOutput,
  flushTerminalBuffer,
  withTimeout,
  toWorkspaceFileContent,
  toDisplayError,
} from "../workspaceUtils";
import { prepareServedHtml, withDesignRuntimeFiles } from "./servedHtml";

export function usePreviewRuntime(options: { repositoryUrl: string; branchName: string }) {
  const { repositoryUrl, branchName } = options;

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
  const [previewRuntimeKind, setPreviewRuntimeKind] = useState<PreviewRuntimeKind>("static");
  const [previewEntryPath, setPreviewEntryPath] = useState<string | null>(null);

  const webContainerRef = useRef<WebContainer | null>(null);
  const runtimeProcessRef = useRef<WebContainerProcess | null>(null);
  const outputPumpAbortRef = useRef<AbortController | null>(null);
  const serverReadySubscribedRef = useRef(false);
  const previewReadyRef = useRef(false);
  const serverReadyTimeoutRef = useRef<number | null>(null);
  const runtimeGenerationRef = useRef(0);
  const previewEntryPathRef = useRef<string | null>(null);
  const previewRuntimeKindRef = useRef<PreviewRuntimeKind>("static");
  const runtimeStartInFlightRef = useRef<Promise<void> | null>(null);
  const previewRuntimeTokenRef = useRef(0);
  const installProcessRef = useRef<WebContainerProcess | null>(null);
  const captureAttemptedRef = useRef(false);

  const appendRuntimeLog = useCallback((line: string) => {
    setRuntimeLog((prev) => {
      const next = [...prev, line];
      if (next.length > 300) {
        return next.slice(next.length - 300);
      }
      return next;
    });
  }, []);

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
      setPreviewRuntimeKind("bundler");
      setPreviewEntryPath(null);
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

      const viteCachePath = profile.workspaceRoot
        ? `${profile.workspaceRoot}/node_modules/.vite`
        : "node_modules/.vite";
      try {
        await container.fs.rm(viteCachePath, { recursive: true, force: true });
        logEvent("Vite 의존성 캐시 초기화 완료");
      } catch {
        // 캐시가 없거나 삭제 API가 실패해도 개발 서버 실행은 계속 시도한다.
      }

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
      setPreviewRuntimeKind("static");
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
      setPreviewEntryPath(entryPath);

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

        const previewSourceFiles = withPreviewDependencyFixes(files);
        const projectProfile = resolvePreviewProject(previewSourceFiles);
        const runtimeFiles = withDesignRuntimeFiles(
          previewSourceFiles,
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
        logEvent(`파일 시스템 준비 중 (${Object.keys(runtimeFiles).length}개)...`);
        const mountMode = await mountOrSyncWorkspace(container, fsTree, flatFiles);
        if (runtimeToken !== previewRuntimeTokenRef.current) return;
        logEvent(
          mountMode === "mounted"
            ? `WebContainer 최초 마운트 완료 (파일 ${Object.keys(runtimeFiles).length}개)`
            : `WebContainer 파일 동기화 완료 (파일 ${Object.keys(runtimeFiles).length}개)`,
        );

        const injected = await injectCaptureAssets(container, projectProfile, previewSourceFiles);
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

  const handleRestartPreview = useCallback(
    async (files: Record<string, LoadedFile>) => {
      if (!Object.keys(files).length) return;
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
        await startRuntime(files);
      } catch (error) {
        setPreviewStatus("error");
        setRuntimeError(toDisplayError(error));
      } finally {
        setIsRestarting(false);
      }
    },
    [logEvent, resetPreviewRuntimeSession, startRuntime, stopRuntimeProcess],
  );

  useEffect(() => {
    return () => {
      previewReadyRef.current = false;
      serverReadySubscribedRef.current = false;
      if (serverReadyTimeoutRef.current) {
        window.clearTimeout(serverReadyTimeoutRef.current);
        serverReadyTimeoutRef.current = null;
      }
      void (async () => {
        await stopRuntimeProcess();
        await teardownWebContainer();
      })();
    };
  }, [stopRuntimeProcess]);

  return {
    previewStatus,
    previewUrl,
    previewRevision,
    previewProjectLabel,
    previewRuntimeKind,
    previewEntryPath,
    runtimeLog,
    runtimeError,
    snapshotCaptureStatus,
    analysisResultId,
    isRestarting,
    designWriteEnabled,
    setPreviewRevision,
    setRuntimeError,
    webContainerRef,
    previewEntryPathRef,
    previewRuntimeKindRef,
    startRuntimeRef,
    logEvent,
    handleRestartPreview,
  };
}
