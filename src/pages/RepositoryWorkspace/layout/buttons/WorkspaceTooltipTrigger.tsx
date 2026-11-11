import type { ReactNode } from "react";

interface WorkspaceTooltipTriggerProps {
  description: string;
  className?: string;
  children: ReactNode;
}

export default function WorkspaceTooltipTrigger({
  description,
  className,
  children,
}: WorkspaceTooltipTriggerProps) {
  return (
    <div className={["group/tooltip relative", className].filter(Boolean).join(" ")}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 w-max max-w-[min(280px,calc(100vw-24px))] -translate-x-1/2 rounded-[5px] border border-slate-200 bg-white px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-slate-600 opacity-0 shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {description}
      </span>
    </div>
  );
}
