import type { ReactNode } from "react";

interface WorkspaceSidebarProps {
  side: "left" | "right";
  label: string;
  children: ReactNode;
}

export const WORKSPACE_SIDEBAR_WIDTH_CLASS = "w-[300px] shrink-0 max-[1360px]:w-[280px]";

const FRAME_CLASS = `flex min-h-0 min-w-0 flex-col overflow-hidden bg-point-50 ${WORKSPACE_SIDEBAR_WIDTH_CLASS}`;

const SIDE_CLASS = {
  left: "border-r border-[#e7e7ec]",
  right: "border-l border-[#e7e7ec]",
} as const;

export default function WorkspaceSidebar({ side, label, children }: WorkspaceSidebarProps) {
  return (
    <aside className={`${FRAME_CLASS} ${SIDE_CLASS[side]}`} aria-label={label}>
      {children}
    </aside>
  );
}
