import type { AccessibilityCategoryGroup } from "../../types";
import AccessibilityIssueItem from "./AccessibilityIssueItem";

interface AccessibilityIssueGroupProps {
  group: AccessibilityCategoryGroup;
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
}

export default function AccessibilityIssueGroup({
  group,
  selectedIssueId,
  onSelectIssue,
}: AccessibilityIssueGroupProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="text-xs font-bold text-slate-500">{group.label}</h3>
      </header>

      <div>
        {group.issues.map((issue) => (
          <AccessibilityIssueItem
            key={issue.id}
            issue={issue}
            isSelected={selectedIssueId === issue.id}
            onSelect={onSelectIssue}
          />
        ))}
      </div>
    </section>
  );
}
