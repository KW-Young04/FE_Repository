import { useMemo, useState } from "react";

import type { AccessibilityCategoryGroup, AccessibilityIssue } from "../../types";
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
  const [opened, setOpened] = useState(true);
  const groupedIssues = useMemo(() => groupIssuesByRule(group.issues), [group.issues]);

  return (
    <section className="mb-[11px] overflow-hidden rounded-[15px] border border-[#e7e5ed] bg-white shadow-[0_1px_2px_rgb(10_10_20/3%)]">
      <button
        type="button"
        className="flex h-[44px] w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent px-[13px] text-left text-[13px] font-bold text-[#17181c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5]"
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{group.label}</span>
          <span className="shrink-0 text-[11px] font-semibold text-slate-400">{groupedIssues.length}</span>
        </span>
        <span
          className={[
            "inline-flex h-3 w-3 shrink-0 text-[0px] text-[#17181c] transition-transform duration-150 after:block after:h-2 after:w-2 after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-current after:content-['']",
            opened ? "rotate-0" : "-rotate-90",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {opened && (
        <div>
          {groupedIssues.map(({ key, issue, occurrences }) => (
            <AccessibilityIssueItem
              key={key}
              issue={issue}
              occurrences={occurrences}
              isSelected={occurrences.some((occurrence) => occurrence.id === selectedIssueId)}
              selectedIssueId={selectedIssueId}
              onSelect={onSelectIssue}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function getIssueGroupKey(issue: AccessibilityIssue) {
  return [issue.code, issue.title, issue.level, issue.status].join("::");
}

function groupIssuesByRule(issues: AccessibilityIssue[]) {
  const issueMap = new Map<
    string,
    { key: string; issue: AccessibilityIssue; occurrences: AccessibilityIssue[] }
  >();

  issues.forEach((issue) => {
    const key = getIssueGroupKey(issue);
    const existing = issueMap.get(key);

    if (existing) {
      existing.occurrences.push(issue);
      return;
    }

    issueMap.set(key, { key, issue, occurrences: [issue] });
  });

  return Array.from(issueMap.values());
}
