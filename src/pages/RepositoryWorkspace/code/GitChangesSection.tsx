import type { GitFileChangeResponse, GitFileStatus } from "@/api/git";

const STATUS_BADGE: Record<GitFileStatus, { label: string; className: string }> = {
  ADDED: { label: "A", className: "bg-emerald-50 text-emerald-600" },
  MODIFIED: { label: "M", className: "bg-amber-50 text-amber-600" },
  DELETED: { label: "D", className: "bg-rose-50 text-rose-600" },
  RENAMED: { label: "R", className: "bg-sky-50 text-sky-600" },
  UNTRACKED: { label: "U", className: "bg-slate-100 text-slate-500" },
};

interface GitChangesSectionProps {
  changedFiles: GitFileChangeResponse[];
  selectedPaths: string[];
  diffPath: string | null;
  isLoading: boolean;
  error: string | null;
  onToggleSelect: (path: string) => void;
  onSelectAll: (selected: boolean) => void;
  onOpenDiff: (path: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
}

export default function GitChangesSection({
  changedFiles,
  selectedPaths,
  diffPath,
  isLoading,
  error,
  onToggleSelect,
  onSelectAll,
  onOpenDiff,
  onRefresh,
}: GitChangesSectionProps) {
  const allSelected = changedFiles.length > 0 && selectedPaths.length === changedFiles.length;

  return (
    <section className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-[0.08em] text-slate-400">
          CHANGES {changedFiles.length > 0 && `(${changedFiles.length})`}
        </h3>

        <div className="flex items-center gap-1">
          {changedFiles.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectAll(!allSelected)}
              className="rounded px-1 text-[10px] font-bold text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            aria-label="변경 사항 새로고침"
            className="rounded px-1 text-[10px] font-bold text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 disabled:opacity-50"
          >
            {isLoading ? "..." : "새로고침"}
          </button>
        </div>
      </div>

      <div className="scrollbar-subtle mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
        {error ? (
          <p className="text-[10px] leading-4 font-medium text-rose-500">{error}</p>
        ) : changedFiles.length === 0 ? (
          <p className="text-[10px] font-medium text-slate-400">
            {isLoading ? "변경 사항을 확인하는 중..." : "변경된 파일이 없습니다."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {changedFiles.map((file) => {
              const badge = STATUS_BADGE[file.status] ?? STATUS_BADGE.MODIFIED;
              const fileName = file.path.split("/").pop() ?? file.path;
              const isActive = diffPath === file.path;

              return (
                <li key={file.path} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selectedPaths.includes(file.path)}
                    onChange={() => onToggleSelect(file.path)}
                    aria-label={`${file.path} 커밋 대상 선택`}
                    className="h-3 w-3 shrink-0 accent-violet-600"
                  />

                  <button
                    type="button"
                    onClick={() => void onOpenDiff(file.path)}
                    title={file.path}
                    className={[
                      "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left",
                      isActive ? "bg-violet-50" : "hover:bg-slate-200/60",
                    ].join(" ")}
                  >
                    <span
                      className={`shrink-0 rounded px-1 text-[9px] font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600">
                      {fileName}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-emerald-500">
                      +{file.addedLines}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-rose-500">
                      -{file.deletedLines}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
