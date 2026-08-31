import { useState } from "react";

import type { ProblemFileGroup } from "../../types";
import { ChevronIcon, SeverityIcon } from "./icons";

interface ProblemsListProps {
  groups: ProblemFileGroup[];
  onSelectProblem: (path: string) => void | Promise<void>;
}

export default function ProblemsList({ groups, onSelectProblem }: ProblemsListProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<string[]>([]);

  const toggleGroup = (path: string) => {
    setCollapsedPaths((prev) =>
      prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path],
    );
  };

  if (groups.length === 0) {
    return (
      <p className="px-4 py-3 text-[11px] font-medium text-slate-400">표시할 문제가 없습니다.</p>
    );
  }

  return (
    <div className="py-1">
      {groups.map((group) => {
        const isOpen = !collapsedPaths.includes(group.path);

        return (
          <section key={group.path}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.path)}
              className="flex w-full items-center gap-1.5 px-2 py-1 text-left hover:bg-slate-50"
            >
              <ChevronIcon open={isOpen} className="shrink-0 text-slate-500" />
              <span className="text-[12px] font-bold text-slate-800">{group.path}</span>
              <span className="text-[10px] font-medium text-slate-400">
                ({group.problems.length})
              </span>
            </button>

            {isOpen && (
              <ul>
                {group.problems.map((problem) => (
                  <li key={problem.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void onSelectProblem(group.path);
                      }}
                      className="flex w-full items-center gap-2 py-[3px] pr-3 pl-7 text-left hover:bg-slate-50"
                    >
                      <span className="shrink-0">
                        <SeverityIcon severity={problem.severity} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600">
                        {problem.message}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        {problem.source} Ln {problem.line}, Col {problem.column}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
