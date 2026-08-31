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
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "design",
    label: "Design",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M9 3H13V7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4.5" cy="11.5" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "code",
    label: "Code",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M5 4.5L1.5 8L5 11.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 4.5L14.5 8L11 11.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
    <header className="relative z-20 flex h-[42px] shrink-0 items-stretch border-b border-slate-200 bg-white">
      <div className="flex w-[298px] shrink-0 items-center gap-1.5 pl-2.5 max-[1360px]:w-[270px]">
        <CodeeLogo />
      </div>

      <nav className="flex flex-1 items-stretch" aria-label="워크스페이스 탭">
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

      <div className="flex w-[248px] shrink-0 items-center justify-end pr-2.5 max-[1360px]:w-[225px]">
        <WorkspaceCommitButton onClick={onCommitClick} disabled={isCommitting}>
          {isCommitting
            ? "처리 중..."
            : changedFileCount > 0
              ? `Commit ${changedFileCount}`
              : "Commit"}
        </WorkspaceCommitButton>
      </div>
    </header>
  );
}
