import { useMemo, useState } from "react";
import WorkspacePreviewMain from "./components/main/WorkspacePreviewMain";
import WorkspaceLeftSidebar from "./components/WorkspaceLeftSidebar";
import WorkspaceRightSidebar from "./components/WorkspaceRightSidebar";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import { findAccessibilityIssue } from "./data/accessibilityIssues";
import { useWorkspacePreview } from "./hooks/useWorkspacePreview";
import type { WorkspaceTab } from "./types";

export default function RepositoryWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const preview = useWorkspacePreview();

  const selectedIssue = useMemo(() => findAccessibilityIssue(selectedIssueId), [selectedIssueId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <WorkspaceTopBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex min-h-0 flex-1">
        <WorkspaceLeftSidebar
          selectedIssueId={selectedIssueId}
          onSelectIssue={setSelectedIssueId}
        />

        <main className="min-w-0 flex-1" aria-label="미리보기 영역">
          <WorkspacePreviewMain {...preview} />
        </main>

        <WorkspaceRightSidebar selectedIssue={selectedIssue} />
      </div>
    </div>
  );
}
