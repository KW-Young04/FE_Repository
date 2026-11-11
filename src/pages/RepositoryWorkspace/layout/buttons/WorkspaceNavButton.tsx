import type { ButtonHTMLAttributes, ReactNode } from "react";

import WorkspaceTooltipTrigger from "./WorkspaceTooltipTrigger";

interface WorkspaceNavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  description: string;
  isActive?: boolean;
}

export default function WorkspaceNavButton({
  icon,
  label,
  description,
  isActive = false,
  className,
  type = "button",
  ...props
}: WorkspaceNavButtonProps) {
  return (
    <WorkspaceTooltipTrigger description={description} className="flex h-full">
      <button
        type={type}
        className={[
          "relative inline-flex h-full cursor-pointer items-center gap-1.5 px-[17px] text-[15px] font-bold transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-point after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-point",
          isActive
            ? "bg-point-50 text-point after:scale-x-100"
            : "bg-transparent text-[#9699a5] after:scale-x-0 hover:text-point",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={isActive ? "page" : undefined}
        {...props}
      >
        {icon}
        {label}
      </button>
    </WorkspaceTooltipTrigger>
  );
}
