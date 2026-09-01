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
    <section className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto bg-[#f7f4ff]">
      <h2 className="flex h-[21px] items-center px-2.5 text-[15px] font-bold text-[#17181c]">상세보기</h2>

      <div>
        {groups.length === 0 && (
          <p className="border-t border-[#dedde3] bg-white px-4 py-8 text-center text-xs font-medium text-slate-400">
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
