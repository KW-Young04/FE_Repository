import type { AccessibilityIssue } from "../types";
import SelectedIssuePanel from "./rightSidebar/SelectedIssuePanel";

interface WorkspaceRightSidebarProps {
  selectedIssue: AccessibilityIssue | null;
}

export default function WorkspaceRightSidebar({ selectedIssue }: WorkspaceRightSidebarProps) {
  return (
    <aside
      className="flex w-[248px] shrink-0 flex-col border-l border-[#e7e7ec] bg-white max-[1360px]:w-[225px]"
      aria-label="이슈 상세 사이드바"
    >
      <SelectedIssuePanel issue={selectedIssue} />
    </aside>
  );
}
