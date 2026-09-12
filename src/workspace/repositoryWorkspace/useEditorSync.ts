import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { WebContainer } from "@webcontainer/api";
import { gitApi, toGitErrorMessage } from "@/api/git";
import { writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { PREVIEW_SYNC_DEBOUNCE_MS } from "../constants";
import type { LoadedFile } from "../types";
import type { PreviewRuntimeKind } from "../previewProject";
import { isPreviewAffectingPath, toDisplayError } from "../workspaceUtils";
import { prepareServedHtml } from "./servedHtml";

export function useEditorSync(options: {
  repositoryUrl: string;
  branchName: string;
  onServerFileSynced?: () => void | Promise<void>;
  activePath: string | null;
  filesByPathRef: MutableRefObject<Record<string, LoadedFile>>;
  setFilesByPath: Dispatch<SetStateAction<Record<string, LoadedFile>>>;
  webContainerRef: MutableRefObject<WebContainer | null>;
  previewRuntimeKindRef: MutableRefObject<PreviewRuntimeKind>;
  previewEntryPathRef: MutableRefObject<string | null>;
  setPreviewRevision: Dispatch<SetStateAction<number>>;
  setRuntimeError: Dispatch<SetStateAction<string | null>>;
  onUserContentEdit?: () => void;
}) {
  const {
    repositoryUrl,
    branchName,
    onServerFileSynced,
    activePath,
    filesByPathRef,
    setFilesByPath,
    webContainerRef,
    previewRuntimeKindRef,
    previewEntryPathRef,
    setPreviewRevision,
    setRuntimeError,
    onUserContentEdit,
  } = options;

  const pendingWriteTimersRef = useRef<Map<string, number>>(new Map());
  const activeWriteTasksRef = useRef<Map<string, Promise<void>>>(new Map());

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
    [branchName, onServerFileSynced, repositoryUrl, setFilesByPath],
  );

  const syncFileToPreviewRuntime = useCallback(
    async (path: string, content: string) => {
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
    },
    [previewEntryPathRef, previewRuntimeKindRef, setPreviewRevision, webContainerRef],
  );

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
  }, [filesByPathRef, syncEditedFile]);

  const handleEditorChange = useCallback(
    (nextValue: string | undefined) => {
      if (!activePath || nextValue === undefined) return;

      const currentFile = filesByPathRef.current[activePath];
      if (currentFile && currentFile.content !== nextValue) {
        onUserContentEdit?.();
      }

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
    [activePath, filesByPathRef, onUserContentEdit, setFilesByPath, setRuntimeError, syncEditedFile],
  );

  useEffect(() => {
    const pendingTimers = pendingWriteTimersRef.current;
    return () => {
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.clear();
    };
  }, []);

  return {
    syncFileToGitWorkspace,
    handleEditorChange,
    flushPendingWrites,
  };
}
