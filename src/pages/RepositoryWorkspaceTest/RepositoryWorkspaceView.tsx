import CodeTabView from "@/pages/RepositoryWorkspace/components/code/CodeTabView";
import PreviewFrame from "@/pages/RepositoryWorkspace/components/preview/PreviewFrame";
import { buildPreviewSrc } from "@/pages/RepositoryWorkspace/utils/previewSrc";

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
  const previewSrc = buildPreviewSrc(previewUrl, previewStatus, previewRevision);
  const previewPlaceholder =
    previewStatus === "error"
      ? (runtimeError ?? loadError ?? "프리뷰를 시작하지 못했습니다.")
      : (loadError ?? loadingMessage) || "프리뷰를 준비하고 있습니다.";

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
          runtimeError={runtimeError}
          loadError={loadError}
          runtimeLog={runtimeLog}
          isRestarting={isRestarting}
          onFileClick={onFileClick}
          onCloseTab={onCloseTab}
          onEditorChange={onEditorChange}
          onRestartPreview={onRestartPreview}
        />

        <section
          className="flex w-1/3 min-w-0 shrink-0 flex-col border-l border-slate-200"
          aria-label="편집 결과 미리보기"
        >
          <div className="shrink-0 border-b border-slate-200 px-3 py-2">
            <strong className="text-sm font-bold text-slate-800">미리보기</strong>
          </div>

          <div className="min-h-0 flex-1 bg-slate-100">
            <PreviewFrame
              previewSrc={previewSrc}
              previewRevision={previewRevision}
              placeholderMessage={previewPlaceholder}
              isLoading={previewStatus === "loading"}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
