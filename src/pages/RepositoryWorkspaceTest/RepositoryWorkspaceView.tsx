import CodeTabView from "@/pages/RepositoryWorkspace/components/code/CodeTabView";

import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceStatusBanner from "./components/WorkspaceStatusBanner";
import type { RepositoryWorkspaceViewProps } from "./types";

export default function RepositoryWorkspaceView({
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
  onFileClick,
  onCloseTab,
  onEditorChange,
  onRestartPreview,
  onNavigateToConnect,
}: RepositoryWorkspaceViewProps) {
  const fileCount = Object.keys(filesByPath).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6">
      <WorkspaceHeader
        tree={tree}
        repositoryUrl={repositoryUrl}
        isRestarting={isRestarting}
        hasFiles={fileCount > 0}
        onRestartPreview={onRestartPreview}
        onNavigateToConnect={onNavigateToConnect}
      />

      <WorkspaceStatusBanner
        loadError={loadError}
        loadingMessage={loadingMessage}
        hasFiles={fileCount > 0}
        truncatedCount={truncatedCount}
        isBackgroundLoading={isBackgroundLoading}
        diagnostics={diagnostics}
      />

      <section className="flex h-[calc(100svh-10rem)] min-h-0 border border-slate-200 bg-white">
        <CodeTabView
          treeItems={treeItems}
          filesByPath={filesByPath}
          openPaths={openPaths}
          activePath={activePath}
          activeFile={activeFile}
          truncatedCount={truncatedCount}
          isBackgroundLoading={isBackgroundLoading}
          previewStatus={previewStatus}
          previewUrl={previewUrl}
          previewRevision={previewRevision}
          runtimeError={runtimeError}
          loadError={loadError}
          loadingMessage={loadingMessage}
          runtimeLog={runtimeLog}
          isRestarting={isRestarting}
          onFileClick={onFileClick}
          onCloseTab={onCloseTab}
          onEditorChange={onEditorChange}
          onRestartPreview={onRestartPreview}
        />
      </section>
    </main>
  );
}
