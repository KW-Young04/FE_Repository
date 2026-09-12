import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { RepositoryWorkspaceViewProps } from "../types";
import { normalizeRepositoryUrl } from "../workspaceUtils";
import { useDesignWriteback } from "./useDesignWriteback";
import { useEditorSync } from "./useEditorSync";
import { usePreviewRuntime } from "./usePreviewRuntime";
import { useWorkspaceLoader } from "./useWorkspaceLoader";

export interface UseRepositoryWorkspaceOptions {
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
  const [contentEditGeneration, setContentEditGeneration] = useState(0);
  const notifyUserContentEdit = useCallback(() => {
    setContentEditGeneration((count) => count + 1);
  }, []);

  const preview = usePreviewRuntime({ repositoryUrl, branchName });
  const loader = useWorkspaceLoader({
    repositoryUrl,
    branchName,
    logEvent: preview.logEvent,
    startRuntimeRef: preview.startRuntimeRef,
    webContainerRef: preview.webContainerRef,
  });
  const editor = useEditorSync({
    repositoryUrl,
    branchName,
    onServerFileSynced,
    activePath: loader.activePath,
    filesByPathRef: loader.filesByPathRef,
    setFilesByPath: loader.setFilesByPath,
    webContainerRef: preview.webContainerRef,
    previewRuntimeKindRef: preview.previewRuntimeKindRef,
    previewEntryPathRef: preview.previewEntryPathRef,
    setPreviewRevision: preview.setPreviewRevision,
    setRuntimeError: preview.setRuntimeError,
    onUserContentEdit: notifyUserContentEdit,
  });
  const design = useDesignWriteback({
    filesByPathRef: loader.filesByPathRef,
    setFilesByPath: loader.setFilesByPath,
    setOpenPaths: loader.setOpenPaths,
    setActivePath: loader.setActivePath,
    webContainerRef: preview.webContainerRef,
    previewRuntimeKindRef: preview.previewRuntimeKindRef,
    previewEntryPathRef: preview.previewEntryPathRef,
    syncFileToGitWorkspace: editor.syncFileToGitWorkspace,
    setRuntimeError: preview.setRuntimeError,
    onUserContentEdit: notifyUserContentEdit,
  });

  const handleRestartPreview = useCallback(
    () => preview.handleRestartPreview(loader.filesByPath),
    [loader.filesByPath, preview.handleRestartPreview],
  );

  return {
    repositoryUrl,
    branchName,
    tree: loader.tree,
    filesByPath: loader.filesByPath,
    openPaths: loader.openPaths,
    activePath: loader.activePath,
    activeFile: loader.activeFile,
    treeItems: loader.treeItems,
    loadingMessage: loader.loadingMessage,
    loadError: loader.loadError,
    truncatedCount: loader.truncatedCount,
    isBackgroundLoading: loader.isBackgroundLoading,
    diagnostics: loader.diagnostics,
    previewStatus: preview.previewStatus,
    previewUrl: preview.previewUrl,
    previewRevision: preview.previewRevision,
    previewProjectLabel: preview.previewProjectLabel,
    runtimeLog: preview.runtimeLog,
    runtimeError: preview.runtimeError,
    snapshotCaptureStatus: preview.snapshotCaptureStatus,
    analysisResultId: preview.analysisResultId,
    isRestarting: preview.isRestarting,
    designWriteEnabled: preview.designWriteEnabled,
    contentEditGeneration,
    onFileClick: loader.handleFileClick,
    onCloseTab: loader.closeTab,
    onEditorChange: editor.handleEditorChange,
    onFlushPendingWrites: editor.flushPendingWrites,
    onRestartPreview: handleRestartPreview,
    onDesignPatch: design.applyDesignToCode,
    onNavigateToConnect: () => navigate("/repository-connect"),
  };
}
