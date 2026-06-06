import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { RepositoryTreeResponse } from "@/api/repository";
import { acquireWebContainer } from "@/utils/webContainerRuntime";
import { getOrStartWorkspaceWarmup } from "@/utils/workspaceWarmup";
import { MAX_PREVIEW_FILE_BYTES, PREVIEW_PORT, PREVIEW_SYNC_DEBOUNCE_MS, SERVER_READY_TIMEOUT_MS } from "./constants";
import type { LoadDiagnostics, LoadedFile, PreviewStatus, RepositoryWorkspaceViewProps } from "./types";
import {
  buildFileSystemTree,
  buildTree,
  createStaticServerScript,
  fetchRepositoryFileWithTimeout,
  findPreviewEntryPath,
  formatDuration,
  ensurePreviewFilesLoaded,
  runBatched,
  selectInitialActivePath,
  isPreviewAffectingPath,
  toDisplayError,
} from "./utils";

const INITIAL_DIAGNOSTICS: LoadDiagnostics = {
  treeMs: null,
  coreMs: null,
  runtimeMs: null,
  backgroundMs: null,
  coreFailedPaths: [],
  backgroundFailedPaths: [],
  lastError: null,
};

export function useRepositoryWorkspace(): RepositoryWorkspaceViewProps {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositoryUrl = searchParams.get("repo") ?? "";

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
  const [runtimeLog, setRuntimeLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  const webContainerRef = useRef<WebContainer | null>(null);
  const runtimeProcessRef = useRef<WebContainerProcess | null>(null);
  const outputPumpAbortRef = useRef<AbortController | null>(null);
  const pendingWriteTimersRef = useRef<Map<string, number>>(new Map());
  const loadSessionIdRef = useRef(0);
  const serverReadySubscribedRef = useRef(false);
  const previewReadyRef = useRef(false);
  const serverReadyTimeoutRef = useRef<number | null>(null);
  const runtimeGenerationRef = useRef(0);
  const previewEntryPathRef = useRef<string | null>(null);

  const activeFile = useMemo(() => {
    if (!activePath) return null;
    return filesByPath[activePath] ?? null;
  }, [activePath, filesByPath]);

  const treeItems = useMemo(() => buildTree(Object.keys(filesByPath)), [filesByPath]);

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
    if (runtimeProcessRef.current) {
      runtimeProcessRef.current.kill();
      runtimeProcessRef.current = null;
    }
  }, []);

  const startRuntime = useCallback(
    async (files: Record<string, LoadedFile>) => {
      setPreviewStatus("loading");
      previewReadyRef.current = false;
      setPreviewRevision(0);
      setRuntimeError(null);
      setPreviewUrl("");
      setRuntimeLog([]);
      logEvent("정적 프리뷰 런타임 시작");

      const container = await acquireWebContainer();
      webContainerRef.current = container;

      const fsTree = buildFileSystemTree(files);
      await container.mount(fsTree);
      logEvent(`WebContainer mount 완료 (파일 ${Object.keys(files).length}개)`);

      const entryPath = findPreviewEntryPath(files);
      if (!entryPath) {
        throw new Error("프리뷰할 HTML 파일을 찾을 수 없습니다. index.html이 포함된 저장소인지 확인해 주세요.");
      }
      if (entryPath !== "index.html" && entryPath !== "index.htm") {
        await container.fs.writeFile("index.html", files[entryPath].content);
        logEvent(`프리뷰 진입점: ${entryPath} → index.html`);
      } else {
        logEvent(`프리뷰 진입점: ${entryPath}`);
      }
      previewEntryPathRef.current = entryPath;

      if (!serverReadySubscribedRef.current) {
        container.on("server-ready", (port, url) => {
          if (port !== PREVIEW_PORT) return;
          previewReadyRef.current = true;
          if (serverReadyTimeoutRef.current) {
            window.clearTimeout(serverReadyTimeoutRef.current);
            serverReadyTimeoutRef.current = null;
          }
          setRuntimeError(null);
          setPreviewUrl(url.endsWith("/") ? url : `${url}/`);
          setPreviewStatus("ready");
          logEvent(`server-ready 수신: ${url}`);
        });
        serverReadySubscribedRef.current = true;
      }

      await stopRuntimeProcess();

      appendRuntimeLog("정적 프리뷰 서버 실행 중...");
      await container.fs.writeFile(".cursor-preview-static-server.mjs", createStaticServerScript());
      const generation = runtimeGenerationRef.current + 1;
      runtimeGenerationRef.current = generation;
      const process = await container.spawn("node", [".cursor-preview-static-server.mjs"], {
        env: {
          PORT: String(PREVIEW_PORT),
        },
      });
      runtimeProcessRef.current = process;
      logEvent("정적 서버 프로세스 시작");
      void process.exit.then((exitCode) => {
        if (runtimeGenerationRef.current !== generation) return;
        // 143(SIGTERM), 137(SIGKILL)은 재시작/정리 시 의도적 종료
        if (exitCode === 0 || exitCode === 143 || exitCode === 137) return;
        const message = `정적 서버 프로세스가 종료되었습니다. (exit: ${exitCode})`;
        setPreviewStatus("error");
        setRuntimeError(message);
        logEvent(message);
      });
      const reader = process.output.getReader();
      const abortController = new AbortController();
      outputPumpAbortRef.current = abortController;
      void (async () => {
        while (true) {
          if (abortController.signal.aborted) return;
          const { done, value } = await reader.read();
          if (done) return;
          if (!value) continue;
          value
            .split("\n")
            .filter((line) => line.trim())
            .forEach((line) => appendRuntimeLog(line));
        }
      })();

      if (serverReadyTimeoutRef.current) {
        window.clearTimeout(serverReadyTimeoutRef.current);
      }
      serverReadyTimeoutRef.current = window.setTimeout(() => {
        if (!previewReadyRef.current) {
          logEvent(
            `server-ready 이벤트가 ${SERVER_READY_TIMEOUT_MS / 1000}초 내 오지 않았습니다. 정적 서버 로그를 확인해 주세요.`,
          );
        }
        serverReadyTimeoutRef.current = null;
      }, SERVER_READY_TIMEOUT_MS);
    },
    [appendRuntimeLog, logEvent, stopRuntimeProcess],
  );

  const loadSingleFile = useCallback(
    async (path: string) => {
      if (!repositoryUrl) return;
      if (filesByPath[path]) return;

      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
      setFilesByPath((prev) => ({
        ...prev,
        [path]: {
          path,
          content: response.content,
          dirty: false,
        },
      }));
      const container = webContainerRef.current;
      if (container) {
        await container.fs.writeFile(path, response.content);
      }
      logEvent(`지연 로드 완료: ${path}`);
    },
    [filesByPath, logEvent, repositoryUrl],
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

    await container.fs.writeFile(path, content);

    const entryPath = previewEntryPathRef.current;
    if (entryPath && entryPath !== "index.html" && entryPath !== "index.htm" && path === entryPath) {
      await container.fs.writeFile("index.html", content);
    }

    if (isPreviewAffectingPath(path) || path === entryPath) {
      setPreviewRevision((revision) => revision + 1);
    }
  }, []);

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
          await syncFileToPreviewRuntime(activePath, nextValue);
        } catch (error) {
          setRuntimeError(`실시간 반영 중 오류가 발생했습니다: ${toDisplayError(error)}`);
        }
      }, PREVIEW_SYNC_DEBOUNCE_MS);

      pendingWriteTimersRef.current.set(activePath, timerId);
    },
    [activePath, syncFileToPreviewRuntime],
  );

  const handleRestartPreview = useCallback(async () => {
    if (!Object.keys(filesByPath).length) return;
    setIsRestarting(true);
    setRuntimeError(null);
    try {
      await startRuntime(filesByPath);
    } catch (error) {
      setPreviewStatus("error");
      setRuntimeError(toDisplayError(error));
    } finally {
      setIsRestarting(false);
    }
  }, [filesByPath, startRuntime]);

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
        const warmed = await getOrStartWorkspaceWarmup(repositoryUrl);
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
        const allPaths = [...loaded.corePaths, ...loaded.deferredPaths];
        const previewFiles = await ensurePreviewFilesLoaded(loaded.files, allPaths, repositoryUrl);
        if (Object.keys(previewFiles).length > Object.keys(loaded.files).length) {
          setFilesByPath((prev) => ({ ...prev, ...previewFiles }));
        }
        await startRuntime(previewFiles);
        const runtimeMs = Date.now() - runtimeStart;
        logEvent(`프리뷰 런타임 준비 완료 (${formatDuration(runtimeMs)})`);
        setDiagnostics((prev) => ({ ...prev, runtimeMs }));

        if (loaded.deferredPaths.length > 0) {
          setIsBackgroundLoading(true);
          setLoadingMessage("나머지 파일을 백그라운드에서 불러오는 중...");
          const backgroundFailedPaths: string[] = [];
          const bgStart = Date.now();
          await runBatched(loaded.deferredPaths, async (path) => {
            if (loadSessionIdRef.current !== sessionId) return;
            let response;
            try {
              response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
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
                  dirty: existing?.dirty ?? false,
                },
              };
            });

            const container = webContainerRef.current;
            if (container) {
              await container.fs.writeFile(path, response.content);
            }
          });
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
  }, [repositoryUrl, startRuntime, logEvent]);

  useEffect(() => {
    const pendingTimers = pendingWriteTimersRef.current;
    return () => {
      loadSessionIdRef.current = 0;
      previewReadyRef.current = false;
      if (serverReadyTimeoutRef.current) {
        window.clearTimeout(serverReadyTimeoutRef.current);
        serverReadyTimeoutRef.current = null;
      }
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.clear();
      void stopRuntimeProcess();
    };
  }, [stopRuntimeProcess]);

  return {
    repositoryUrl,
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
    runtimeLog,
    runtimeError,
    isRestarting,
    onFileClick: handleFileClick,
    onCloseTab: closeTab,
    onEditorChange: handleEditorChange,
    onRestartPreview: handleRestartPreview,
    onNavigateToConnect: () => navigate("/repository-connect"),
  };
}
