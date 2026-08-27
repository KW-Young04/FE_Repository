import type { ButtonHTMLAttributes } from "react";

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface WorkspaceCommitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export default function WorkspaceCommitButton({
  label = "Commit",
  className,
  type = "button",
  children,
  ...props
}: WorkspaceCommitButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <CheckIcon />
      {children ?? label}
    </button>
  );
}
