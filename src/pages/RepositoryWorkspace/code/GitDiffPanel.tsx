interface GitDiffPanelProps {
  path: string | null;
  diff: string | null;
  isLoading: boolean;
}

function lineClassName(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "text-slate-400";
  if (line.startsWith("@@")) return "text-violet-500";
  if (line.startsWith("+")) return "bg-emerald-50 text-emerald-700";
  if (line.startsWith("-")) return "bg-rose-50 text-rose-700";
  return "text-slate-600";
}

export default function GitDiffPanel({ path, diff, isLoading }: GitDiffPanelProps) {
  if (!path) {
    return (
      <p className="px-3 py-2 text-[11px] font-medium text-slate-400">
        탐색기의 CHANGES 목록에서 파일을 선택하면 변경 내용이 표시됩니다.
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="px-3 py-2 text-[11px] font-medium text-slate-400">
        {path} 의 변경 내용을 불러오는 중...
      </p>
    );
  }

  if (!diff?.trim()) {
    return (
      <p className="px-3 py-2 text-[11px] font-medium text-slate-400">
        {path} 에 표시할 변경 내용이 없습니다.
      </p>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="mb-1 text-[11px] font-bold text-slate-800">{path}</p>

      <pre className="overflow-x-auto font-mono text-[11px] leading-5">
        {diff.split("\n").map((line, index) => (
          <div key={`${index}-${line}`} className={`px-1 ${lineClassName(line)}`}>
            {line || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}
