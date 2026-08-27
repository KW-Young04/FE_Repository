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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 13L13 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
  onTabChange: (tab: WorkspaceTab) => void;
}

export default function WorkspaceTopBar({ activeTab, onTabChange }: WorkspaceTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="w-36 shrink-0">
        <CodeeLogo />
      </div>

      <nav className="flex flex-1 items-center justify-center gap-1" aria-label="워크스페이스 탭">
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

      <div className="flex w-36 shrink-0 justify-end">
        <WorkspaceCommitButton />
      </div>
    </header>
  );
}
