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
    <section className="min-h-0 flex-1 overflow-y-auto">
      <h2 className="px-1 text-sm font-bold text-slate-900">상세보기</h2>

      <div className="mt-3 space-y-3 pb-2">
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
