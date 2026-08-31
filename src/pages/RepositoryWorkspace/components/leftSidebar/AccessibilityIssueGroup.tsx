import { useState } from "react";

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
  const [opened, setOpened] = useState(true);

  return (
    <section className="border-t border-[#e3e1e9]">
      <button
        type="button"
        className="flex min-h-[43px] w-full cursor-pointer items-center gap-1.5 border-0 bg-[#f7f4ff] px-2 text-left text-[11px] font-semibold text-[#2e3037] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5]"
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened}
      >
        <span
          className={[
            "inline-flex text-[#6d3df5] transition-transform duration-150",
            opened ? "rotate-90" : "rotate-0",
          ].join(" ")}
          aria-hidden="true"
        >
          ›
        </span>
        <span>{group.label}</span>
      </button>

      {opened && (
        <div className="bg-white">
          {group.issues.map((issue) => (
            <AccessibilityIssueItem
              key={issue.id}
              issue={issue}
              isSelected={selectedIssueId === issue.id}
              onSelect={onSelectIssue}
            />
          ))}
        </div>
      )}
    </section>
  );
}
