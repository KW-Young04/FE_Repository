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
        "inline-flex h-[30px] min-w-[108px] items-center justify-center gap-1.5 rounded-[5px] bg-point px-4 text-[13px] font-bold text-white shadow-[0_3px_8px_color-mix(in_srgb,var(--color-point)_19%,transparent)] transition-colors hover:bg-point-hover disabled:cursor-not-allowed disabled:bg-point-300 disabled:shadow-none",
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
