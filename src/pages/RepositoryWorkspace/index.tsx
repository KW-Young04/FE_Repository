import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { GitFileChangeResponse } from "@/api/git";
import { useRepositoryWorkspace } from "@/pages/RepositoryWorkspaceTest/useRepositoryWorkspace";
import { normalizeRepositoryUrl } from "@/pages/RepositoryWorkspaceTest/utils";

import WorkspaceChatSidebar from "./components/chat/WorkspaceChatSidebar";
import CodeTabView from "./components/code/CodeTabView";
import DesignInspectorSidebar from "./components/design/DesignInspectorSidebar";
import CommitDialog from "./components/git/CommitDialog";
import WorkspacePreviewMain from "./components/main/WorkspacePreviewMain";
import WorkspaceLeftSidebar from "./components/WorkspaceLeftSidebar";
import WorkspaceRightSidebar from "./components/WorkspaceRightSidebar";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import { useDesignInspector } from "./hooks/useDesignInspector";
import { useGitWorkspace } from "./hooks/useGitWorkspace";
import { useRealtimeAnalysis } from "./hooks/useRealtimeAnalysis";
import type { WorkspaceTab } from "./types";
import { findIssueInGroups } from "./utils/analysisMapping";
import { buildPreviewSrc } from "./utils/previewSrc";

export default function RepositoryWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [searchParams] = useSearchParams();
  const repositoryUrl = normalizeRepositoryUrl(searchParams.get("repo") ?? "");
  const branchName = searchParams.get("branch") ?? "";
  const gitRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const workspace = useRepositoryWorkspace({
    onServerFileSynced: () => gitRefreshRef.current?.(),
  });
  const localChangedFiles = useMemo<GitFileChangeResponse[]>(
    () =>
      Object.values(workspace.filesByPath)
        .filter((file) => file.dirty)
        .map((file) => ({
          path: file.path,
          status: "MODIFIED",
          addedLines: 0,
          deletedLines: 0,
        })),
    [workspace.filesByPath],
  );
  const git = useGitWorkspace({
    repositoryUrl,
    branchName,
    localChangedFiles,
  });

  useEffect(() => {
    gitRefreshRef.current = git.refresh;
  }, [git.refresh]);

  const analysis = useRealtimeAnalysis({
    repositoryUrl: workspace.repositoryUrl,
    activePath: workspace.activePath,
    code: workspace.activeFile?.content ?? null,
    encoding: workspace.activeFile?.encoding,
  });

  const selectedIssue = useMemo(
    () => findIssueInGroups(analysis.issueGroups, selectedIssueId),
    [analysis.issueGroups, selectedIssueId],
  );
  const previewIssueHighlights = useMemo(
    () => analysis.issueGroups.flatMap((group) => group.issues),
    [analysis.issueGroups],
  );

  useEffect(() => {
    const firstIssue = previewIssueHighlights[0];
    if (!firstIssue) {
      setSelectedIssueId(null);
      return;
    }
    const hasSelectedIssue = previewIssueHighlights.some((issue) => issue.id === selectedIssueId);
    if (!hasSelectedIssue) {
      setSelectedIssueId(firstIssue.id);
    }
  }, [previewIssueHighlights, selectedIssueId]);

  const previewSrc = buildPreviewSrc(
    workspace.previewUrl,
    workspace.previewStatus,
    workspace.previewRevision,
  );

  const commitAfterFlush = async (message: string) => {
    await workspace.onFlushPendingWrites();
    return git.commit(message);
  };

  const commitAndPushAfterFlush = async (message: string, remote?: string) => {
    await workspace.onFlushPendingWrites();
    return git.commitAndPush(message, remote);
  };

  const design = useDesignInspector({
    previewSrc,
    onDesignPatch: workspace.onDesignPatch,
  });

  const isDesignTab = activeTab === "design";

  const leftSidebar = (
    <WorkspaceLeftSidebar
      score={analysis.score}
      groups={analysis.issueGroups}
      selectedIssueId={selectedIssueId}
      isAnalyzing={analysis.isAnalyzing}
      isSupported={analysis.isSupported}
      analyzedPath={analysis.analyzedPath}
      error={analysis.error}
      onSelectIssue={setSelectedIssueId}
      onReaudit={analysis.reanalyze}
    />
  );

  return (
    <div className="flex h-screen min-w-[1180px] flex-col overflow-hidden bg-white text-[#202124]">
      <WorkspaceTopBar
        activeTab={activeTab}
        changedFileCount={git.changedFiles.length}
        isCommitting={git.isCommitting}
        onTabChange={setActiveTab}
        onCommitClick={() => setIsCommitDialogOpen(true)}
      />

      <div
        className={[
          "grid min-h-0 flex-1",
          activeTab === "code"
            ? "grid-cols-[300px_minmax(560px,1fr)_320px] max-[1360px]:grid-cols-[280px_minmax(560px,1fr)_300px]"
            : activeTab === "overview"
              ? "grid-cols-[300px_minmax(620px,1fr)_285px] max-[1360px]:grid-cols-[280px_minmax(620px,1fr)_260px]"
              : "grid-cols-[300px_minmax(650px,1fr)_248px] max-[1360px]:grid-cols-[280px_minmax(650px,1fr)_225px]",
        ].join(" ")}
      >
        {leftSidebar}

        {activeTab === "code" ? (
          <>
            <CodeTabView
              treeItems={workspace.treeItems}
              filesByPath={workspace.filesByPath}
              openPaths={workspace.openPaths}
              activePath={workspace.activePath}
              activeFile={workspace.activeFile}
              truncatedCount={workspace.truncatedCount}
              isBackgroundLoading={workspace.isBackgroundLoading}
              runtimeError={workspace.runtimeError}
              loadError={workspace.loadError}
              runtimeLog={workspace.runtimeLog}
              isRestarting={workspace.isRestarting}
              onFileClick={workspace.onFileClick}
              onCloseTab={workspace.onCloseTab}
              onEditorChange={workspace.onEditorChange}
              onRestartPreview={workspace.onRestartPreview}
              problemGroups={analysis.problemGroups}
              isAnalyzing={analysis.isAnalyzing}
              analysisError={analysis.error}
              branches={git.branches}
              currentBranch={git.currentBranch}
              changedFiles={git.changedFiles}
              selectedPaths={git.selectedPaths}
              diffPath={git.diffPath}
              diff={git.diff}
              isDiffLoading={git.isDiffLoading}
              isGitLoading={git.isLoading}
              gitError={git.error}
              onToggleChangeSelect={git.toggleSelectedPath}
              onSelectAllChanges={git.setAllSelected}
              onOpenDiff={git.openDiff}
              onRefreshGit={git.refresh}
            />

            <WorkspaceChatSidebar />
          </>
        ) : (
          <>
            <main className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto" aria-label="미리보기 영역">
              <WorkspacePreviewMain
                repositoryUrl={workspace.repositoryUrl}
                previewStatus={workspace.previewStatus}
                previewUrl={workspace.previewUrl}
                previewRevision={workspace.previewRevision}
                runtimeError={workspace.runtimeError}
                loadError={workspace.loadError}
                loadingMessage={workspace.loadingMessage}
                iframeRef={design.iframeRef}
                issueHighlights={previewIssueHighlights}
                selectedIssueId={selectedIssueId}
                isDesignTab={isDesignTab}
                showErrors={showErrors}
                onToggleErrors={() => setShowErrors((current) => !current)}
                onRefresh={() => {
                  void workspace.onRestartPreview();
                }}
                onSelectIssue={setSelectedIssueId}
              />
            </main>

            {isDesignTab ? (
              <DesignInspectorSidebar
                selectedElement={design.selectedElement}
                values={design.designValues}
                onChange={design.handleDesignChange}
              />
            ) : (
              <WorkspaceRightSidebar
                selectedIssue={selectedIssue}
                onEditInCode={() => {
                  setActiveTab("code");
                  if (selectedIssue?.targetFilePath) {
                    void workspace.onFileClick(selectedIssue.targetFilePath);
                  }
                }}
              />
            )}
          </>
        )}
      </div>

      {isCommitDialogOpen && (
        <CommitDialog
          currentBranch={git.currentBranch}
          changedFiles={git.changedFiles}
          selectedPaths={git.selectedPaths}
          isCommitting={git.isCommitting}
          commandMessage={git.commandMessage}
          commandFailed={git.commandFailed}
          onToggleSelect={git.toggleSelectedPath}
          onSelectAll={git.setAllSelected}
          onCommit={commitAfterFlush}
          onPush={git.push}
          onCommitAndPush={commitAndPushAfterFlush}
          onClose={() => {
            setIsCommitDialogOpen(false);
            git.dismissCommandMessage();
          }}
        />
      )}
    </div>
  );
}
