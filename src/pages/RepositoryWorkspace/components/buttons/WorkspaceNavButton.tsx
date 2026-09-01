import type { ButtonHTMLAttributes, ReactNode } from "react";

interface WorkspaceNavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
}

export default function WorkspaceNavButton({
  icon,
  label,
  isActive = false,
  className,
  type = "button",
  ...props
}: WorkspaceNavButtonProps) {
  return (
    <button
      type={type}
      className={[
        "relative inline-flex h-full items-center gap-1.5 px-[17px] text-[13px] font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[#6d3df5] after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5]",
        isActive
          ? "bg-[#f7f4ff] text-[#6d3df5] after:scale-x-100"
          : "bg-transparent text-[#9699a5] after:scale-x-0 hover:text-[#6d3df5]",
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
  );
}
