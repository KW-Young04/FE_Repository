import type { ButtonHTMLAttributes } from "react";

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 8C13.5 11.0376 11.0376 13.5 8 13.5C4.96243 13.5 2.5 11.0376 2.5 8C2.5 4.96243 4.96243 2.5 8 2.5C9.65685 2.5 11.1569 3.17157 12.2426 4.25736"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12.5 2.5H9.5V5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        "inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-md bg-[#6d42ff] px-3 text-[15px] font-bold text-white transition-colors hover:bg-[#5b2de8] disabled:cursor-not-allowed disabled:bg-[#cbbffb]",
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
