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
    <section className="border-b border-[#dedde3] first:border-t">
      <button
        type="button"
        className="flex h-[45px] w-full cursor-pointer items-center gap-2 border-0 bg-[#f7f4ff] px-2.5 text-left text-[14px] font-medium text-[#17181c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5]"
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened}
      >
        <span
          className={[
            "inline-flex h-3 w-3 shrink-0 text-[0px] text-[#17181c] transition-transform duration-150 after:block after:h-2 after:w-2 after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-current after:content-['']",
            opened ? "rotate-0" : "-rotate-90",
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
