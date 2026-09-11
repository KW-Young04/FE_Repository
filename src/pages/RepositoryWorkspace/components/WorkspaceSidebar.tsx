import type { ReactNode } from "react";

interface WorkspaceSidebarProps {
  side: "left" | "right";
  label: string;
  children: ReactNode;
}

const FRAME_CLASS = "flex min-h-0 min-w-0 flex-col overflow-hidden bg-[#f7f4ff]";

const SIDE_CLASS = {
  left: "border-r border-[#e7e7ec]",
  right: "border-l border-[#e7e7ec]",
} as const;

export default function WorkspaceSidebar({
  side,
  label,
  children,
}: WorkspaceSidebarProps) {
  return (
    <aside className={`${FRAME_CLASS} ${SIDE_CLASS[side]}`} aria-label={label}>
      {children}
    </aside>
  );
}
