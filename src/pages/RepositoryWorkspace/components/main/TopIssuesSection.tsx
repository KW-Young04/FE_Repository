import type { AccessibilityIssue } from "../../types";
import IssueCard from "./IssueCard";

interface TopIssuesSectionProps {
  issues: AccessibilityIssue[];
  totalCount: number;
  onSelectIssue?: (issueId: string) => void;
}

export default function TopIssuesSection({
  issues,
  totalCount,
  onSelectIssue,
}: TopIssuesSectionProps) {
  return (
    <section className="h-[239px] shrink-0 border-t border-slate-200 bg-white px-[17px] pt-[20px] pb-3">
      <div className="mb-[13px] flex items-center justify-between">
        <h2 className="m-0 text-[15px] font-bold text-slate-900">주요 이슈 Top3</h2>
        <span className="text-[9px] text-slate-400">총 {totalCount}개 항목 검사</span>
      </div>

      {issues.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[11px] font-medium text-slate-400">
          표시할 주요 이슈가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-[11px]">
          {issues.map((issue, index) => (
            <IssueCard key={issue.id} issue={issue} rank={index + 1} onSelect={onSelectIssue} />
          ))}
        </div>
      )}
    </section>
  );
}
