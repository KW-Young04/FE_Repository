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
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        isActive ? "text-violet-600" : "text-slate-400 hover:text-slate-600",
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
