import type { CommitNode } from "../../types";

interface CommitGraphSectionProps {
  commits: CommitNode[];
}

export default function CommitGraphSection({ commits }: CommitGraphSectionProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <h3 className="shrink-0 text-[10px] font-bold tracking-[0.08em] text-slate-400">GRAPH</h3>

      <ol className="scrollbar-subtle mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
        {commits.map((commit, index) => {
          const nextCommit = commits[index + 1];

          return (
            <li key={commit.id} className="relative flex gap-2 pb-4 last:pb-0">
              <div className="relative flex w-3 shrink-0 justify-center">
                {nextCommit && (
                  <span
                    className="absolute top-3 bottom-[-16px] w-px"
                    style={{ backgroundColor: nextCommit.color, opacity: 0.5 }}
                    aria-hidden="true"
                  />
                )}
                <span
                  className="relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={
                    commit.isHead
                      ? { border: `2.5px solid ${commit.color}`, backgroundColor: "#FFFFFF" }
                      : { backgroundColor: commit.color }
                  }
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[11px] font-bold text-slate-800">{commit.message}</p>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-bold text-white"
                    style={{ backgroundColor: commit.color }}
                  >
                    {commit.branch}
                  </span>
                </div>
                <p className="truncate text-[10px] font-medium text-slate-400">{commit.author}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
