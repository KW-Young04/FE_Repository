import type { AccessibilityIssue } from "../types";
import SelectedIssuePanel from "./rightSidebar/SelectedIssuePanel";

interface WorkspaceRightSidebarProps {
  selectedIssue: AccessibilityIssue | null;
  onEditInCode?: () => void;
}

export default function WorkspaceRightSidebar({
  selectedIssue,
  onEditInCode,
}: WorkspaceRightSidebarProps) {
  return (
    <aside
      className="flex min-h-0 min-w-0 flex-col border-l border-[#e7e7ec] bg-[#f7f4ff]"
      aria-label="이슈 상세 사이드바"
    >
      <SelectedIssuePanel issue={selectedIssue} onEditInCode={onEditInCode} />
    </aside>
  );
}
