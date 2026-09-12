import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useCallback } from "react";
import type { WebContainer } from "@webcontainer/api";
import { toGitErrorMessage } from "@/api/git";
import { writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import type { LoadedFile } from "../types";
import type { PreviewRuntimeKind } from "../previewProject";
import { applyInlineStyleToSource } from "../designWriteback";
import { toDisplayError } from "../workspaceUtils";
import { prepareServedHtml } from "./servedHtml";

export function useDesignWriteback(options: {
  filesByPathRef: MutableRefObject<Record<string, LoadedFile>>;
  setFilesByPath: Dispatch<SetStateAction<Record<string, LoadedFile>>>;
  setOpenPaths: Dispatch<SetStateAction<string[]>>;
  setActivePath: Dispatch<SetStateAction<string | null>>;
  webContainerRef: MutableRefObject<WebContainer | null>;
  previewRuntimeKindRef: MutableRefObject<PreviewRuntimeKind>;
  previewEntryPathRef: MutableRefObject<string | null>;
  syncFileToGitWorkspace: (path: string, content: string) => Promise<void>;
  setRuntimeError: Dispatch<SetStateAction<string | null>>;
  onUserContentEdit?: () => void;
}) {
  const {
    filesByPathRef,
    setFilesByPath,
    setOpenPaths,
    setActivePath,
    webContainerRef,
    previewRuntimeKindRef,
    previewEntryPathRef,
    syncFileToGitWorkspace,
    setRuntimeError,
    onUserContentEdit,
  } = options;

  const applyDesignToCode = useCallback(
    (sourceId: number | null, css: Record<string, string>) => {
      // 정적 HTML 프리뷰에서만 소스 코드에 되돌려 쓸 수 있다.
      if (previewRuntimeKindRef.current !== "static") return;
      if (sourceId == null) return;
      const entryPath = previewEntryPathRef.current;
      if (!entryPath) return;

      const entryFile = filesByPathRef.current[entryPath];
      if (!entryFile || entryFile.encoding === "base64") return;

      const patched = applyInlineStyleToSource(entryFile.content, sourceId, css);
      if (patched == null || patched === entryFile.content) return;

      onUserContentEdit?.();

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
    },
    [
      filesByPathRef,
      previewEntryPathRef,
      previewRuntimeKindRef,
      setActivePath,
      setFilesByPath,
      setOpenPaths,
      onUserContentEdit,
      setRuntimeError,
      syncFileToGitWorkspace,
      webContainerRef,
    ],
  );

  return { applyDesignToCode };
}
