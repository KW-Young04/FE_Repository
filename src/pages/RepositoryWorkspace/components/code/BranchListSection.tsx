import type { BranchItem } from "../../types";
import { CheckIcon, PlusIcon } from "./icons";

interface BranchListSectionProps {
  branches: BranchItem[];
  currentBranchId: string;
  onSelectBranch: (branchId: string) => void;
}

export default function BranchListSection({
  branches,
  currentBranchId,
  onSelectBranch,
}: BranchListSectionProps) {
  return (
    <section className="shrink-0 border-t border-slate-200 px-3 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.08em] text-slate-400">BRANCHES</h3>
        <button
          type="button"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
          aria-label="브랜치 추가"
        >
          <PlusIcon />
        </button>
      </div>

      <ul className="mt-2 space-y-0.5">
        {branches.map((branch) => {
          const isCurrent = branch.id === currentBranchId;

          return (
            <li key={branch.id}>
              <button
                type="button"
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onSelectBranch(branch.id)}
                className={[
                  "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px]",
                  isCurrent
                    ? "bg-sky-50 font-bold text-sky-600"
                    : "font-medium text-slate-600 hover:bg-slate-200/60",
                ].join(" ")}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: branch.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{branch.name}</span>
                {isCurrent && <CheckIcon className="shrink-0 text-slate-400" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
