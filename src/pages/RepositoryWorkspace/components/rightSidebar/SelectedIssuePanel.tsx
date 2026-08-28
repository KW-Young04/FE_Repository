import type { AccessibilityIssue } from "../../types";

interface SelectedIssuePanelProps {
  issue: AccessibilityIssue | null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xs leading-relaxed break-words text-slate-600">{value}</p>
    </div>
  );
}

export default function SelectedIssuePanel({ issue }: SelectedIssuePanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-900">선택한 이슈</h2>
        <span className="text-slate-400" aria-hidden="true">
          ›
        </span>
      </header>

      {issue ? (
        <article className="scrollbar-subtle mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
              {issue.level}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{issue.title}</h3>
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-500">
                  {issue.status === "complete"
                    ? "PASS"
                    : issue.status === "in_progress"
                      ? "CHECK"
                      : "FAIL"}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-bold text-slate-400">WCAG {issue.code}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{issue.summary}</p>
            </div>
          </div>

          {issue.targetSelector && <DetailRow label="대상 요소" value={issue.targetSelector} />}
          {issue.targetFilePath && <DetailRow label="파일" value={issue.targetFilePath} />}

          {issue.originalCodeBlock && (
            <div className="mt-3">
              <p className="text-[11px] font-bold text-slate-400">문제 코드</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-2 font-mono text-[11px] leading-5 whitespace-pre-wrap text-slate-600">
                {issue.originalCodeBlock}
              </pre>
            </div>
          )}

          {issue.suggestion && (
            <div className="mt-3 rounded-lg bg-violet-50 p-3">
              <p className="text-[11px] font-bold text-violet-500">개선 제안</p>
              <p className="mt-1 text-xs leading-relaxed break-words text-violet-900">
                {issue.suggestion}
              </p>
            </div>
          )}

          {(issue.measuredValue || issue.thresholdValue) && (
            <div className="mt-3 flex gap-4">
              {issue.measuredValue && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400">측정값</p>
                  <p className="mt-0.5 text-xs font-bold text-rose-500">{issue.measuredValue}</p>
                </div>
              )}
              {issue.thresholdValue && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400">기준값</p>
                  <p className="mt-0.5 text-xs font-bold text-emerald-600">
                    {issue.thresholdValue}
                  </p>
                </div>
              )}
            </div>
          )}
        </article>
      ) : (
        <div className="mt-3 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-500">
            상세보기에서 이슈를 선택하면
            <br />
            여기에 내용이 표시됩니다.
          </p>
        </div>
      )}
    </section>
  );
}
