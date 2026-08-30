import type { BranchItem } from "../../types";
import { CheckIcon, PlusIcon } from "./icons";

interface BranchListSectionProps {
  branches: BranchItem[];
  currentBranchId: string;
  onSelectBranch: (branchId: string) => void;
  /** 백엔드에 체크아웃 API가 없어 실제 Git 브랜치 목록은 읽기 전용으로 표시한다. */
  isReadOnly?: boolean;
}

export default function BranchListSection({
  branches,
  currentBranchId,
  onSelectBranch,
  isReadOnly = false,
}: BranchListSectionProps) {
  return (
    <section className="shrink-0 border-t border-slate-200 px-3 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.08em] text-slate-400">BRANCHES</h3>
        {!isReadOnly && (
          <button
            type="button"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            aria-label="브랜치 추가"
          >
            <PlusIcon />
          </button>
        )}
      </div>

      <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto">
        {branches.map((branch) => {
          const isCurrent = branch.id === currentBranchId;
          const content = (
            <>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: branch.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{branch.name}</span>
              {isCurrent && <CheckIcon className="shrink-0 text-slate-400" />}
            </>
          );

          const baseClassName = [
            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px]",
            isCurrent ? "bg-sky-50 font-bold text-sky-600" : "font-medium text-slate-600",
          ].join(" ");

          return (
            <li key={branch.id}>
              {isReadOnly ? (
                <div
                  className={baseClassName}
                  title={branch.name}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  {content}
                </div>
              ) : (
                <button
                  type="button"
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => onSelectBranch(branch.id)}
                  className={`${baseClassName} ${isCurrent ? "" : "hover:bg-slate-200/60"}`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
