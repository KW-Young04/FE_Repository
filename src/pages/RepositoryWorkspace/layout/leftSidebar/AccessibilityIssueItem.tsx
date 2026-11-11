import {
  formatIssueLineRange,
  IssueLevelBadge,
  IssueLocationTable,
  IssueResultBadge,
} from "../../overview/IssueParts";
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
  occurrences: AccessibilityIssue[];
  isSelected: boolean;
  selectedIssueId: string | null;
  onSelect: (issueId: string) => void;
}

export default function AccessibilityIssueItem({
  issue,
  occurrences,
  isSelected,
  selectedIssueId,
  onSelect,
}: AccessibilityIssueItemProps) {
  return (
    <article
      className={["border-t border-[#efeef3]", isSelected ? "bg-point-50" : "bg-white"].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSelect(issue.id)}
        className="grid w-full cursor-pointer grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-[9px] bg-transparent px-[13px] py-2.5 text-left transition-colors hover:bg-[#fbfbfd]"
        aria-current={isSelected ? "true" : undefined}
      >
        <IssueLevelBadge level={issue.level} size="sm" />

        <span className="flex min-w-0 flex-col leading-tight">
          <small className="text-[11px] font-normal text-slate-400">{issue.code}</small>
          <strong className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-[#17181c]">
            {issue.title}
          </strong>
          <span className="mt-1 text-[10px] font-semibold text-slate-400">
            <span className={STATUS_CLASS[issue.status]}>{STATUS_LABEL[issue.status]}</span>
            {occurrences.length > 1 && ` · ${occurrences.length}개 위치에서 발견`}
          </span>
        </span>

        <IssueResultBadge status={issue.status} />
      </button>

      <div className="space-y-1.5 px-[13px] pb-3">
        {occurrences.map((occurrence, index) => {
          const selected = occurrence.id === selectedIssueId;
          const lineRange = formatIssueLineRange(occurrence);

          return (
            <button
              key={occurrence.id}
              type="button"
              onClick={() => onSelect(occurrence.id)}
              className={[
                "block w-full cursor-pointer rounded-[10px] border bg-white p-2 text-left shadow-[0_1px_2px_rgb(10_10_20/3%)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-point",
                selected ? "border-point" : "border-[#e7e5ed] hover:border-point-200",
              ].join(" ")}
              aria-current={selected ? "true" : undefined}
            >
              <IssueLocationTable issue={occurrence} />
              <span className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>{lineRange || "행 정보 없음"}</span>
                {occurrences.length > 1 && (
                  <span className="font-bold text-point">#{index + 1}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
