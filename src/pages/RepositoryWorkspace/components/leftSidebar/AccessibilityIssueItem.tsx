import type { AccessibilityIssue, IssueStatus } from "../../types";

const STATUS_LABEL: Record<IssueStatus, string> = {
  in_progress: "In Progress",
  complete: "Complete",
  pending: "Pending",
};

const STATUS_CLASS: Record<IssueStatus, string> = {
  in_progress: "text-sky-500",
  complete: "text-cyan-500",
  pending: "text-slate-400",
};

interface AccessibilityIssueItemProps {
  issue: AccessibilityIssue;
  isSelected: boolean;
  onSelect: (issueId: string) => void;
}

export default function AccessibilityIssueItem({
  issue,
  isSelected,
  onSelect,
}: AccessibilityIssueItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(issue.id)}
      className={[
        "flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0",
        isSelected ? "bg-violet-50" : "hover:bg-slate-50",
      ].join(" ")}
      aria-current={isSelected ? "true" : undefined}
    >
      <span className="min-w-0">
        <span className="block text-xs font-medium text-slate-400">{issue.code}</span>
        <span className="block truncate text-sm font-bold text-slate-900">{issue.title}</span>
      </span>

      <span className="shrink-0 text-sm font-bold text-sky-500">{issue.level}</span>

      <span
        className={`w-20 shrink-0 text-right text-xs font-semibold ${STATUS_CLASS[issue.status]}`}
      >
        {STATUS_LABEL[issue.status]}
      </span>
    </button>
  );
}
