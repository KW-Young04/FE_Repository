import { useMemo, useState } from "react";

import { useRepositoryWorkspace } from "@/pages/RepositoryWorkspaceTest/useRepositoryWorkspace";

import CodeTabView from "./components/code/CodeTabView";
import DesignInspectorSidebar from "./components/design/DesignInspectorSidebar";
import WorkspacePreviewMain from "./components/main/WorkspacePreviewMain";
import WorkspaceLeftSidebar from "./components/WorkspaceLeftSidebar";
import WorkspaceRightSidebar from "./components/WorkspaceRightSidebar";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import { findAccessibilityIssue } from "./data/accessibilityIssues";
import { useDesignInspector } from "./hooks/useDesignInspector";
import type { WorkspaceTab } from "./types";
import { buildPreviewSrc } from "./utils/previewSrc";

export default function RepositoryWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const workspace = useRepositoryWorkspace();

  const selectedIssue = useMemo(() => findAccessibilityIssue(selectedIssueId), [selectedIssueId]);

  const previewSrc = buildPreviewSrc(
    workspace.previewUrl,
    workspace.previewStatus,
    workspace.previewRevision,
  );

  const design = useDesignInspector({
    previewSrc,
    onDesignPatch: workspace.onDesignPatch,
  });

  const isDesignTab = activeTab === "design";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <WorkspaceTopBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex min-h-0 flex-1">
        {activeTab === "code" ? (
          <CodeTabView
            treeItems={workspace.treeItems}
            filesByPath={workspace.filesByPath}
            openPaths={workspace.openPaths}
            activePath={workspace.activePath}
            activeFile={workspace.activeFile}
            truncatedCount={workspace.truncatedCount}
            isBackgroundLoading={workspace.isBackgroundLoading}
            previewStatus={workspace.previewStatus}
            previewUrl={workspace.previewUrl}
            previewRevision={workspace.previewRevision}
            runtimeError={workspace.runtimeError}
            loadError={workspace.loadError}
            loadingMessage={workspace.loadingMessage}
            runtimeLog={workspace.runtimeLog}
            isRestarting={workspace.isRestarting}
            onFileClick={workspace.onFileClick}
            onCloseTab={workspace.onCloseTab}
            onEditorChange={workspace.onEditorChange}
            onRestartPreview={workspace.onRestartPreview}
          />
        ) : (
          <>
            <WorkspaceLeftSidebar
              selectedIssueId={selectedIssueId}
              onSelectIssue={setSelectedIssueId}
            />

            <main className="min-w-0 flex-1" aria-label="미리보기 영역">
              <WorkspacePreviewMain
                repositoryUrl={workspace.repositoryUrl}
                previewStatus={workspace.previewStatus}
                previewUrl={workspace.previewUrl}
                previewRevision={workspace.previewRevision}
                previewProjectLabel={workspace.previewProjectLabel}
                runtimeError={workspace.runtimeError}
                loadError={workspace.loadError}
                loadingMessage={workspace.loadingMessage}
                iframeRef={isDesignTab ? design.iframeRef : undefined}
                trailingBadge={
                  isDesignTab ? (
                    <span className="hidden shrink-0 text-[11px] font-semibold text-violet-600 sm:block">
                      요소를 클릭해 편집
                    </span>
                  ) : null
                }
              />
            </main>

            {isDesignTab ? (
              <DesignInspectorSidebar
                selectedElement={design.selectedElement}
                values={design.designValues}
                designWriteEnabled={workspace.designWriteEnabled}
                onChange={design.handleDesignChange}
              />
            ) : (
              <WorkspaceRightSidebar selectedIssue={selectedIssue} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
