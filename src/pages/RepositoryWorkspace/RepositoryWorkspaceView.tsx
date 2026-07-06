import type { RepositoryWorkspaceViewProps } from "./types";
import EditorPanel from "./components/EditorPanel";
import FileTreePanel from "./components/FileTreePanel";
import PreviewPanel from "./components/PreviewPanel";
import WorkspaceHeader from "./components/WorkspaceHeader";
import WorkspaceStatusBanner from "./components/WorkspaceStatusBanner";

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
  previewProjectLabel,
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

      <section className="grid h-[calc(100svh-10rem)] min-h-0 grid-cols-12 gap-3">
        <FileTreePanel
          treeItems={treeItems}
          fileCount={fileCount}
          activePath={activePath}
          onFileClick={onFileClick}
        />
        <EditorPanel
          openPaths={openPaths}
          filesByPath={filesByPath}
          activePath={activePath}
          activeFile={activeFile}
          onFileClick={onFileClick}
          onCloseTab={onCloseTab}
          onEditorChange={onEditorChange}
        />
        <PreviewPanel
          previewStatus={previewStatus}
          previewUrl={previewUrl}
          previewRevision={previewRevision}
          previewProjectLabel={previewProjectLabel}
          runtimeError={runtimeError}
          runtimeLog={runtimeLog}
        />
      </section>
    </main>
  );
}
