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
      className="grid h-[49px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_48px_96px] items-center border-t border-[#dedde3] bg-white py-0 pr-2 pl-[42px] text-left transition-colors hover:bg-[#fbfbfd] max-[1360px]:grid-cols-[minmax(0,1fr)_44px_88px] max-[1360px]:pl-8"
      aria-current={isSelected ? "true" : undefined}
    >
      <span className="flex min-w-0 flex-col pr-2 leading-tight">
        <small className="text-[11px] font-normal text-[#8b8b8f]">{issue.code}</small>
        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-[#202124]">
          {issue.title}
        </strong>
      </span>

      <span className="justify-self-center text-[13px] font-bold text-[#0095ff]">
        {issue.level}
      </span>

      <span
        className={`justify-self-center whitespace-nowrap text-[13px] font-semibold ${STATUS_CLASS[issue.status]}`}
      >
        {STATUS_LABEL[issue.status]}
      </span>
    </button>
  );
}
