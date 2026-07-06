import type { AccessibilityIssue } from "../types";
import SelectedIssuePanel from "./rightSidebar/SelectedIssuePanel";

interface WorkspaceRightSidebarProps {
  selectedIssue: AccessibilityIssue | null;
}

export default function WorkspaceRightSidebar({ selectedIssue }: WorkspaceRightSidebarProps) {
  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-[#F7F7FB] p-3"
      aria-label="이슈 상세 사이드바"
    >
      <SelectedIssuePanel issue={selectedIssue} />
    </aside>
  );
}
