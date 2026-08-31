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
    <section className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1">
      <h2 className="px-1 text-sm font-bold text-slate-900">상세보기</h2>

      <div className="mt-3 space-y-3 pb-2">
        {groups.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs font-medium text-slate-400">
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
