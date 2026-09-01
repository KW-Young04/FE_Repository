import type { AccessibilityIssue, IssueStatus } from "../../types";

const STATUS_LABEL: Record<IssueStatus, string> = {
  in_progress: "In Progress",
  complete: "Complete",
  pending: "Pending",
};

const STATUS_CLASS: Record<IssueStatus, string> = {
  in_progress: "text-[#008cff]",
  complete: "text-cyan-500",
  pending: "text-[#858791]",
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
        "grid min-h-14 w-full cursor-pointer grid-cols-[minmax(0,1fr)_36px_75px] items-center border-t border-[#ededf1] py-0 pr-3 pl-10 text-left transition-colors max-[1360px]:pl-7",
        isSelected ? "bg-[#f7f4ff]" : "bg-white hover:bg-[#fbfaff]",
      ].join(" ")}
      aria-current={isSelected ? "true" : undefined}
    >
      <span className="flex min-w-0 flex-col gap-px">
        <small className="text-[9px] text-[#8c8e98]">{issue.code}</small>
        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-medium text-[#36383f]">
          {issue.title}
        </strong>
      </span>

      <span className="text-[10px] font-bold text-[#008cff]">{issue.level}</span>

      <span
        className={`justify-self-end whitespace-nowrap text-[10px] font-semibold ${STATUS_CLASS[issue.status]}`}
      >
        {STATUS_LABEL[issue.status]}
      </span>
    </button>
  );
}
