import { useState } from "react";

import Button from "@/components/Button";

import type { AccessibilityIssue } from "../../types";

interface SelectedIssuePanelProps {
  issue: AccessibilityIssue | null;
  onEditInCode?: () => void;
}

const cardClasses =
  "mb-[11px] rounded-[15px] border border-[#e7e5ed] bg-white p-[13px] shadow-[0_1px_2px_rgb(10_10_20/3%)]";

function parseRatio(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(?::|\/)?\s*(\d+(?:\.\d+)?)?/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = match[2] ? Number(match[2]) : 1;
  if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) return null;
  return left / right;
}

export default function SelectedIssuePanel({ issue, onEditInCode }: SelectedIssuePanelProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const measuredRatio = parseRatio(issue?.measuredValue);
  const thresholdRatio = parseRatio(issue?.thresholdValue);
  const barPercent =
    measuredRatio != null && thresholdRatio != null && thresholdRatio > 0
      ? Math.min(100, Math.round((measuredRatio / thresholdRatio) * 100))
      : issue
        ? 8
        : 0;

  return (
    <aside className="selected-issue-panel min-h-0 flex-1 overflow-y-auto px-3 py-3.5">
      <h2 className="mt-px mb-[13px] text-[11px] font-bold">선택한 이슈</h2>

      {issue ? (
        <>
          <section className={cardClasses}>
            <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-[9px]">
              <span className="grid size-[31px] place-items-center rounded-full bg-[#ff4f5b] text-[10px] font-bold text-white">
                {issue.level}
              </span>

              <div>
                <strong className="mt-0.5 block text-[11px]">{issue.title}</strong>
                <p className="mt-2.5 mb-0 text-[9px] leading-[1.65] text-slate-400">
                  {issue.summary}
                </p>
              </div>

              <span className="rounded-[9px] bg-[#ffe3e5] px-1.5 py-[3px] text-[8px] font-extrabold text-[#ff5d66]">
                {issue.status === "complete" ? "PASS" : "FAIL"}
              </span>
            </div>
          </section>

          <section className={`${cardClasses} p-3.5`}>
            <div className="mb-3.5 flex justify-between text-[9px] text-slate-400">
              <span>
                현재 대비율 <em className="not-italic text-[#ff5b63]">(문제됨)</em>
              </span>
              <strong className="text-slate-700">{issue.measuredValue || "—"}</strong>
            </div>

            <div className="mb-3.5 flex justify-between text-[9px] text-slate-400">
              <span>
                권장 대비 <em className="not-italic text-[#ff5b63]">(문제됨)</em>
              </span>
              <strong className="text-slate-700">{issue.thresholdValue || "—"}</strong>
            </div>

            <div className="h-[3px] rounded-[3px] bg-[#efeff2]">
              <span
                className="block h-full rounded-[inherit] bg-[#ff5963]"
                style={{ width: `${barPercent}%` }}
              />
            </div>
          </section>

          <section className={cardClasses}>
            <h3 className="mt-0 mb-3 text-[9px] font-semibold text-slate-400">위치 정보</h3>

            <div className="grid grid-cols-[1fr_1.15fr] border border-slate-200">
              <code className="overflow-hidden px-2 py-[7px] font-[inherit] text-[8px] text-ellipsis whitespace-nowrap text-slate-500">
                {issue.targetFilePath || "파일 정보 없음"}
              </code>
              <code className="overflow-hidden border-l border-slate-200 px-2 py-[7px] font-[inherit] text-[8px] text-ellipsis whitespace-nowrap text-slate-500">
                {issue.targetSelector || "셀렉터 없음"}
              </code>
            </div>

            {issue.originalCodeBlock && (
              <pre className="mt-2 overflow-x-auto border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[8px] leading-4 whitespace-pre-wrap text-slate-500">
                {issue.originalCodeBlock}
              </pre>
            )}
          </section>

          <section className={cardClasses}>
            <h3 className="mt-0 mb-3 text-[10px] font-semibold text-[#6d3df5]">✦ AI 추천 개선안</h3>

            {issue.suggestion ? (
              <p className="mt-0 mb-3 text-[8px] leading-[1.6] text-slate-400">{issue.suggestion}</p>
            ) : (
              <p className="mt-0 mb-3 text-[8px] leading-[1.6] text-slate-400">
                텍스트 색상을 더 어둡게 조정하면 AA·AAA 기준을 모두 충족할 수 있습니다.
              </p>
            )}

            <Button variant="purple" className="h-[33px] w-full rounded text-[10px]">
              ✦ AI 수정 실행
            </Button>

            <button
              type="button"
              onClick={onEditInCode}
              className="mt-[5px] h-[33px] w-full cursor-pointer rounded border-0 bg-transparent text-[10px] font-medium text-[#a4a5ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]"
            >
              코드 직접 수정
            </button>
          </section>

          <button
            type="button"
            onClick={() => setGuideOpen((open) => !open)}
            className="flex h-[38px] w-full items-center justify-between rounded-[14px] border border-[#e8e6ed] bg-white px-[15px] text-[9px] font-semibold text-[#53555d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]"
          >
            관련 가이드
            <span>{guideOpen ? "⌃" : "⌄"}</span>
          </button>

          {guideOpen && (
            <p className="mt-2 px-1 text-[9px] leading-4 text-slate-400">
              WCAG {issue.code} — {issue.title}
            </p>
          )}
        </>
      ) : (
        <p className="rounded-[15px] border border-dashed border-[#e7e5ed] bg-white px-3 py-10 text-center text-[10px] font-medium text-slate-400">
          상세보기에서 이슈를 선택하면
          <br />
          여기에 내용이 표시됩니다.
        </p>
      )}
    </aside>
  );
}
