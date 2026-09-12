import type { ReactNode } from "react";
import type { WorkspaceTab } from "../types";
import { WorkspaceCommitButton, WorkspaceNavButton } from "./buttons";
import CodeeLogo from "./CodeeLogo";
import {
  getWorkspaceLayoutGridClass,
  WORKSPACE_SIDEBAR_WIDTH_CLASS,
} from "./WorkspaceSidebar";

interface NavItem {
  id: WorkspaceTab;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.9" />
        <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.9" />
        <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.9" />
        <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    ),
  },
  {
    id: "design",
    label: "Design",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
          stroke="currentColor"
          strokeWidth="1.9"
        />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    ),
  },
  {
    id: "code",
    label: "Code",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m8 9-3 3 3 3" stroke="currentColor" strokeWidth="1.9" />
        <path d="m16 9 3 3-3 3" stroke="currentColor" strokeWidth="1.9" />
        <path d="m14 5-4 14" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    ),
  },
];

interface WorkspaceTopBarProps {
  activeTab: WorkspaceTab;
  changedFileCount: number;
  isCommitting: boolean;
  onTabChange: (tab: WorkspaceTab) => void;
  onCommitClick: () => void;
}

export default function WorkspaceTopBar({
  activeTab,
  changedFileCount,
  isCommitting,
  onTabChange,
  onCommitClick,
}: WorkspaceTopBarProps) {
  return (
    <header
      className={`relative z-20 grid h-[47px] shrink-0 items-stretch border-b border-slate-200 bg-white ${getWorkspaceLayoutGridClass(activeTab)}`}
    >
      <div className={`flex items-center gap-[7px] pl-2.5 ${WORKSPACE_SIDEBAR_WIDTH_CLASS}`}>
        <CodeeLogo />
      </div>

      <nav className="flex items-stretch" aria-label="분석 결과 보기">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <WorkspaceNavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={isActive}
              onClick={() => onTabChange(item.id)}
            />
          );
        })}
      </nav>

      <div className={`flex items-center justify-end ${WORKSPACE_SIDEBAR_WIDTH_CLASS}`}>
        <WorkspaceCommitButton
          onClick={onCommitClick}
          disabled={isCommitting}
          className="mr-[9px] min-w-[108px]"
        >
          {isCommitting ? "처리 중..." : changedFileCount > 0 ? `Commit ${changedFileCount}` : "Commit"}
        </WorkspaceCommitButton>
      </div>
    </header>
  );
}
