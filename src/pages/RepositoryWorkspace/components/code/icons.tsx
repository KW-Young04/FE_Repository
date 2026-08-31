import type { ProblemSeverity } from "../../types";

interface IconProps {
  className?: string;
}

export function ChevronIcon({ open, className }: IconProps & { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ transform: open ? "rotate(90deg)" : undefined }}
    >
      <path
        d="M4.5 2.5L8 6L4.5 9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.5 3.5A1 1 0 0 1 2.5 2.5H5L6.2 4H11.5a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 1.75h4.4L11 5.35v6.9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M7.3 1.9v3.4h3.4" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4.75"
        y="4.75"
        width="7.5"
        height="7.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M9.25 4.5v-1a1.5 1.5 0 0 0-1.5-1.5h-4.5a1.5 1.5 0 0 0-1.5 1.5v4.5a1.5 1.5 0 0 0 1.5 1.5h1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RevertIcon({ className }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2.5 6.2a4.6 4.6 0 1 1 .9 3.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M1.6 2.9v3.4h3.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2.5 7.4L5.4 10.3L11.5 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1.75 2.5h8.5L7 6.4v3.3L5 10.5V6.4L1.75 2.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MinimizeIcon({ className }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function MaximizeIcon({ className }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6.8 5.2L10 2m0 0H7.4M10 2v2.6M5.2 6.8L2 10m0 0h2.6M2 10V7.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const SEVERITY_LABEL: Record<ProblemSeverity, string> = {
  error: "오류",
  warning: "경고",
  info: "정보",
};

export function SeverityIcon({ severity }: { severity: ProblemSeverity }) {
  if (severity === "warning") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        role="img"
        aria-label={SEVERITY_LABEL.warning}
      >
        <path
          d="M7 1.9l5.2 9.2H1.8L7 1.9Z"
          stroke="#F59E0B"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M7 5.6v2.5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="7" cy="9.7" r="0.6" fill="#F59E0B" />
      </svg>
    );
  }

  if (severity === "info") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        role="img"
        aria-label={SEVERITY_LABEL.info}
      >
        <circle cx="7" cy="7" r="5.2" stroke="#3B82F6" strokeWidth="1.2" />
        <path d="M7 6.3v3.1" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="7" cy="4.5" r="0.6" fill="#3B82F6" />
      </svg>
    );
  }

  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      role="img"
      aria-label={SEVERITY_LABEL.error}
    >
      <circle cx="7" cy="7" r="5.2" stroke="#EF4444" strokeWidth="1.2" />
      <path
        d="M5.3 5.3l3.4 3.4M8.7 5.3L5.3 8.7"
        stroke="#EF4444"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
