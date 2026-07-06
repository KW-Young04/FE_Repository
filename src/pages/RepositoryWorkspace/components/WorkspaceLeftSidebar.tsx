import { ACCESSIBILITY_ISSUE_GROUPS, ACCESSIBILITY_SCORE } from "../data/accessibilityIssues";
import { WorkspaceReauditButton } from "./buttons";
import AccessibilityDetailSection from "./leftSidebar/AccessibilityDetailSection";
import AccessibilityScoreCard from "./leftSidebar/AccessibilityScoreCard";

interface WorkspaceLeftSidebarProps {
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}

export default function WorkspaceLeftSidebar({
  selectedIssueId,
  onSelectIssue,
}: WorkspaceLeftSidebarProps) {
  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-[#F7F7FB] p-3"
      aria-label="접근성 검사 사이드바"
    >
      <AccessibilityScoreCard score={ACCESSIBILITY_SCORE} />

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <AccessibilityDetailSection
          groups={ACCESSIBILITY_ISSUE_GROUPS}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
        />
      </div>

      <div className="mt-3 shrink-0 pt-1">
        <WorkspaceReauditButton />
      </div>
    </aside>
  );
}
