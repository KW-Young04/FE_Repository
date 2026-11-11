import type { ButtonHTMLAttributes } from "react";

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

interface WorkspaceReauditButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function WorkspaceReauditButton({
  label = "웹 접근성 재검사",
  className,
  type = "button",
  children,
  ...props
}: WorkspaceReauditButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-md bg-point px-3 text-[13px] font-bold text-white transition-colors hover:bg-point-hover disabled:cursor-not-allowed disabled:bg-point-300",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <RefreshIcon />
      {children ?? label}
    </button>
  );
}
