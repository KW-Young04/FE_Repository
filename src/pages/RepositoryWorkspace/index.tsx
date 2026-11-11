import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { GitFileChangeResponse } from "@/api/git";
import { useRepositoryWorkspace } from "@/workspace/useRepositoryWorkspace";
import { normalizeRepositoryUrl } from "@/workspace/workspaceUtils";

import { findIssueInGroups } from "./analysis/analysisMapping";
import { useRealtimeAnalysis } from "./analysis/useRealtimeAnalysis";
import CodeTabView from "./code/CodeTabView";
import { useGitWorkspace } from "./code/useGitWorkspace";
import { useDesignInspector } from "./design/useDesignInspector";
import CommitDialog from "./layout/git/CommitDialog";
import LeaveWorkspaceDialog from "./layout/LeaveWorkspaceDialog";
import WorkspaceLeftSidebar from "./layout/WorkspaceLeftSidebar";
import WorkspaceRightSidebar from "./layout/WorkspaceRightSidebar";
import { getWorkspaceLayoutGridClass } from "./layout/WorkspaceSidebar";
import WorkspaceTopBar from "./layout/WorkspaceTopBar";
import { buildPreviewSrc } from "./preview/previewSrc";
import WorkspacePreviewMain from "./preview/WorkspacePreviewMain";
import type { AccessibilityIssue, WorkspaceTab } from "./types";

export default function RepositoryWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
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
    branchName: workspace.branchName,
    previewUrl: workspace.previewUrl,
    previewStatus: workspace.previewStatus,
    filesByPath: workspace.filesByPath,
    previewRuntimeKind: workspace.previewRuntimeKind,
    previewEntryPath: workspace.previewEntryPath,
    contentEditGeneration: workspace.contentEditGeneration,
    onFlushPendingWrites: workspace.onFlushPendingWrites,
    setShowErrors,
  });

  const previewIssueHighlights = useMemo(
    () => analysis.issueGroups.flatMap((group) => group.issues),
    [analysis.issueGroups],
  );
  const visibleSelectedIssueId = previewIssueHighlights.some(
    (issue) => issue.id === selectedIssueId,
  )
    ? selectedIssueId
    : null;
  const selectedIssue = useMemo(
    () => findIssueInGroups(analysis.issueGroups, visibleSelectedIssueId),
    [analysis.issueGroups, visibleSelectedIssueId],
  );
  const [closingIssue, setClosingIssue] = useState<AccessibilityIssue | null>(null);
  const issuePanelIssue = selectedIssue ?? closingIssue;

  const clearSelectedIssue = () => {
    setClosingIssue(selectedIssue);
    setSelectedIssueId(null);
  };

  const handleSelectIssue = (issueId: string) => {
    if (issueId === visibleSelectedIssueId) {
      clearSelectedIssue();
      return;
    }
    setClosingIssue(null);
    setSelectedIssueId(issueId);
  };

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

  const leaveWorkspace = async () => {
    setIsLeaving(true);
    setLeaveError(null);
    try {
      await workspace.onFlushPendingWrites();
    } catch {
      setLeaveError("편집 중인 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setIsLeaving(false);
      return;
    }
    setIsLeaving(false);
    setIsLeaveDialogOpen(false);
    workspace.onNavigateToConnect();
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
      selectedIssueId={visibleSelectedIssueId}
      isAnalyzing={analysis.isAnalyzing}
      isSupported={analysis.isSupported}
      analyzedPath={analysis.analyzedPath}
      hasPendingEdits={analysis.hasPendingEdits}
      canReaudit={analysis.canReaudit}
      error={analysis.error}
      onSelectIssue={handleSelectIssue}
      onReaudit={analysis.reanalyze}
    />
  );

  const rightSidebar =
    activeTab === "code" ? (
      <WorkspaceRightSidebar panel="chat" />
    ) : isDesignTab ? (
      <WorkspaceRightSidebar
        panel="design"
        selectedElement={design.selectedElement}
        values={design.designValues}
        onChange={design.handleDesignChange}
      />
    ) : issuePanelIssue ? (
      <div
        className={[
          "flex min-h-0 overflow-hidden",
          selectedIssue
            ? "animate-sidebar-slide-in"
            : "pointer-events-none animate-sidebar-slide-out",
        ].join(" ")}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && !selectedIssue) setClosingIssue(null);
        }}
      >
        <WorkspaceRightSidebar
          panel="issue"
          selectedIssue={issuePanelIssue}
          onClose={clearSelectedIssue}
          onEditInCode={() => {
            setActiveTab("code");
            if (issuePanelIssue.targetFilePath) {
              void workspace.onFileClick(issuePanelIssue.targetFilePath);
            }
          }}
        />
      </div>
    ) : null;

  return (
    <div className="flex h-screen min-w-[1180px] flex-col overflow-hidden bg-white text-[#202124]">
      <WorkspaceTopBar
        activeTab={activeTab}
        changedFileCount={git.changedFiles.length}
        isCommitting={git.isCommitting}
        onTabChange={setActiveTab}
        onCommitClick={() => setIsCommitDialogOpen(true)}
        onLogoClick={() => setIsLeaveDialogOpen(true)}
      />

      <LeaveWorkspaceDialog
        isOpen={isLeaveDialogOpen}
        changedFileCount={git.changedFiles.length}
        isLeaving={isLeaving}
        error={leaveError}
        onCancel={() => {
          setIsLeaveDialogOpen(false);
          setLeaveError(null);
        }}
        onConfirm={() => void leaveWorkspace()}
      />

      <div className={`grid min-h-0 flex-1 ${getWorkspaceLayoutGridClass(activeTab)}`}>
        {activeTab === "code" ? (
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
        ) : (
          <main
            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
            aria-label="미리보기 영역"
          >
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
              selectedIssueId={visibleSelectedIssueId}
              filesByPath={workspace.filesByPath}
              isDesignTab={isDesignTab}
              showErrors={showErrors}
              onToggleErrors={() => setShowErrors((current) => !current)}
            />
          </main>
        )}

        {leftSidebar}

        {rightSidebar}
      </div>

      {isCommitDialogOpen && (
        <CommitDialog
          repositoryUrl={repositoryUrl}
          branchName={branchName}
          issues={previewIssueHighlights}
          currentBranch={git.currentBranch}
          branches={git.branches.map((branch) => branch.name)}
          changedFiles={git.changedFiles}
          selectedPaths={git.selectedPaths}
          isCommitting={git.isCommitting}
          commandMessage={git.commandMessage}
          commandFailed={git.commandFailed}
          onToggleSelect={git.toggleSelectedPath}
          onSelectAll={git.setAllSelected}
          onCommit={commitAfterFlush}
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
