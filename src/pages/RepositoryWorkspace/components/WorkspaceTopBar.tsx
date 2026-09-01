import type { ReactNode } from "react";
import type { WorkspaceTab } from "../types";
import { WorkspaceCommitButton, WorkspaceNavButton } from "./buttons";
import CodeeLogo from "./CodeeLogo";

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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <header className="relative z-20 grid h-[42px] shrink-0 grid-cols-[298px_minmax(650px,1fr)_248px] items-stretch border-b border-slate-200 bg-white max-[1360px]:grid-cols-[270px_minmax(650px,1fr)_225px]">
      <div className="flex items-center gap-[7px] pl-2.5">
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

      <WorkspaceCommitButton
        onClick={onCommitClick}
        disabled={isCommitting}
        className="mr-[9px] min-w-[108px] self-center justify-self-end"
      >
        {isCommitting ? "처리 중..." : changedFileCount > 0 ? `Commit ${changedFileCount}` : "Commit"}
      </WorkspaceCommitButton>
    </header>
  );
}
