import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebContainer } from "@webcontainer/api";
import type { RepositoryTreeResponse } from "@/api/repository";
import { acquireWebContainer } from "@/utils/webContainerRuntime";
import { writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { getOrStartWorkspaceWarmup, invalidateWorkspaceWarmup } from "@/utils/workspaceWarmup";
import { MAX_PREVIEW_FILE_BYTES, PRELOAD_BATCH_SIZE } from "../constants";
import type { LoadDiagnostics, LoadedFile } from "../types";
import { resolvePreviewProject, withPreviewDependencyFixes } from "../previewProject";
import {
  buildTree,
  fetchRepositoryFileWithTimeout,
  formatDuration,
  ensurePreviewFilesLoaded,
  runBatched,
  selectInitialActivePath,
  toDisplayError,
  ensurePackageJsonDiscovery,
  preloadRepositoryPaths,
  getBundlerPreloadPaths,
  getBundlerBackgroundPaths,
  getBackgroundPreloadPaths,
  toWorkspaceFileContent,
} from "../workspaceUtils";

const INITIAL_DIAGNOSTICS: LoadDiagnostics = {
  treeMs: null,
  coreMs: null,
  runtimeMs: null,
  backgroundMs: null,
  coreFailedPaths: [],
  backgroundFailedPaths: [],
  lastError: null,
};

export function useWorkspaceLoader(options: {
  repositoryUrl: string;
  branchName: string;
  logEvent: (message: string) => void;
  startRuntimeRef: MutableRefObject<(files: Record<string, LoadedFile>) => Promise<void>>;
  webContainerRef: MutableRefObject<WebContainer | null>;
}) {
  const { repositoryUrl, branchName, logEvent, startRuntimeRef, webContainerRef } = options;

  const [tree, setTree] = useState<RepositoryTreeResponse | null>(null);
  const [filesByPath, setFilesByPath] = useState<Record<string, LoadedFile>>({});
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("저장소를 준비하는 중입니다.");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncatedCount, setTruncatedCount] = useState(0);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<LoadDiagnostics>(INITIAL_DIAGNOSTICS);

  const loadSessionIdRef = useRef(0);
  const filesByPathRef = useRef(filesByPath);
  useEffect(() => {
    filesByPathRef.current = filesByPath;
  }, [filesByPath]);

  const activeFile = useMemo(() => {
    if (!activePath) return null;
    return filesByPath[activePath] ?? null;
  }, [activePath, filesByPath]);

  const treeItems = useMemo(() => {
    const treePaths =
      tree?.nodes.filter((node) => node.type === "blob").map((node) => node.path) ?? [];
    return buildTree(treePaths.length > 0 ? treePaths : Object.keys(filesByPath));
  }, [filesByPath, tree]);

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
    [filesByPath, logEvent, repositoryUrl, branchName, webContainerRef],
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
        const treePathSizes = new Map(
          warmed.tree.nodes
            .filter((node) => node.type === "blob")
            .map((node) => [node.path, node.size ?? 0] as const),
        );
        const allPaths = [...loaded.corePaths, ...loaded.deferredPaths];
        let previewFiles = await ensurePreviewFilesLoaded(
          loaded.files,
          allPaths,
          repositoryUrl,
          branchName,
          treePathSizes,
        );
        previewFiles = await ensurePackageJsonDiscovery(
          previewFiles,
          allTreePaths,
          repositoryUrl,
          branchName,
        );

        let runtimePreviewFiles = withPreviewDependencyFixes(previewFiles);
        const bundlerProfile = resolvePreviewProject(runtimePreviewFiles);
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
              undefined,
              treePathSizes,
            );
            runtimePreviewFiles = withPreviewDependencyFixes(previewFiles);
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
        await startRuntimeRef.current(runtimePreviewFiles);
        const runtimeMs = Date.now() - runtimeStart;
        logEvent(`프리뷰 런타임 준비 완료 (${formatDuration(runtimeMs)})`);
        setDiagnostics((prev) => ({ ...prev, runtimeMs }));

        const backgroundPaths =
          bundlerProfile.kind === "bundler"
            ? getBackgroundPreloadPaths(
                bundlerBackgroundPaths,
                new Set(Object.keys(previewFiles)),
                treePathSizes,
              )
            : getBackgroundPreloadPaths(
                loaded.deferredPaths,
                new Set(Object.keys(previewFiles)),
                treePathSizes,
              );

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
  }, [repositoryUrl, branchName, logEvent, startRuntimeRef, webContainerRef]);

  return {
    tree,
    filesByPath,
    filesByPathRef,
    openPaths,
    activePath,
    activeFile,
    treeItems,
    loadingMessage,
    loadError,
    truncatedCount,
    isBackgroundLoading,
    diagnostics,
    setFilesByPath,
    setOpenPaths,
    setActivePath,
    handleFileClick,
    closeTab,
  };
}
