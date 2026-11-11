import type { AccessibilityCategoryGroup } from "../../types";
import AccessibilityIssueGroup from "./AccessibilityIssueGroup";

interface AccessibilityDetailSectionProps {
  groups: AccessibilityCategoryGroup[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}

export default function AccessibilityDetailSection({
  groups,
  selectedIssueId,
  onSelectIssue,
}: AccessibilityDetailSectionProps) {
  return (
    <section className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto bg-point-50 px-[9px] pb-1">
      <h2 className="mt-px mb-[13px] text-[15px] font-bold text-[#17181c]">상세보기</h2>

      <div>
        {groups.length === 0 && (
          <p className="rounded-[15px] border border-dashed border-[#e7e5ed] bg-white px-3 py-10 text-center text-[12px] font-medium text-slate-400">
            표시할 위반 항목이 없습니다.
          </p>
        )}

        {groups.map((group) => (
          <AccessibilityIssueGroup
            key={group.id}
            group={group}
            selectedIssueId={selectedIssueId}
            onSelectIssue={onSelectIssue}
          />
        ))}
      </div>
    </section>
  );
}
