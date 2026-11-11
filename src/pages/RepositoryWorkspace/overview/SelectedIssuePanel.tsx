import { formatIssueLineRange } from "./issueFormatting";
import { useState } from "react";

import Button from "@/components/Button";

import type { AccessibilityIssue } from "../types";
import {
  IssueLevelBadge,
  IssueLocationTable,
  IssueResultBadge,
  issueCardClasses,
} from "./IssueParts";

interface SelectedIssuePanelProps {
  issue: AccessibilityIssue;
  onEditInCode?: () => void;
  onClose: () => void;
  onBack?: () => void;
}

const cardClasses = `mb-[11px] p-[13px] ${issueCardClasses}`;

function parseRatio(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(?::|\/)?\s*(\d+(?:\.\d+)?)?/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = match[2] ? Number(match[2]) : 1;
  if (!Number.isFinite(left) || !Number.isFinite(right) || right === 0) return null;
  return left / right;
}

export default function SelectedIssuePanel({
  issue,
  onEditInCode,
  onClose,
  onBack,
}: SelectedIssuePanelProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const measuredRatio = parseRatio(issue.measuredValue);
  const thresholdRatio = parseRatio(issue.thresholdValue);
  const barPercent =
    measuredRatio != null && thresholdRatio != null && thresholdRatio > 0
      ? Math.min(100, Math.round((measuredRatio / thresholdRatio) * 100))
      : 8;

  return (
    <div className="selected-issue-panel min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3.5">
      <header className="mt-px mb-[13px] flex items-center justify-between">
        <h2 className="m-0 text-[15px] font-bold">선택한 이슈</h2>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded px-1.5 text-xs leading-none font-semibold text-slate-600 hover:bg-point-100 focus-visible:outline-2 focus-visible:outline-point"
            aria-label="웹 접근성 검사로 돌아가기"
          >
            <span>뒤로 가기</span>
            <svg
              className="block shrink-0"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m9 4 4 4-4 4M13 8H3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        {!onBack && (
          <button
            type="button"
            onClick={onClose}
            aria-label="선택 해제"
            title="선택 해제"
            className="grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[16px] leading-none text-slate-400 transition-colors hover:bg-point-100 hover:text-[#17181c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-point"
          >
            ×
          </button>
        )}
      </header>

      <section className={cardClasses}>
        <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-[9px]">
          <IssueLevelBadge level={issue.level} />

          <div>
            <strong className="mt-0.5 block text-[13px]">{issue.title}</strong>
            <p className="mt-2.5 mb-0 text-[11px] leading-[1.65] text-slate-400">{issue.summary}</p>
          </div>

          <IssueResultBadge status={issue.status} />
        </div>
      </section>

      {measuredRatio != null && thresholdRatio != null && (
        <section className={`${cardClasses} p-3.5`}>
          <div className="mb-3.5 flex justify-between text-[11px] text-slate-400">
            <span>
              현재 대비율{" "}
              {measuredRatio < thresholdRatio && (
                <em className="not-italic text-[#ff5b63]">(문제됨)</em>
              )}
            </span>
            <strong className="text-slate-700">{issue.measuredValue || "—"}</strong>
          </div>

          <div className="mb-3.5 flex justify-between text-[11px] text-slate-400">
            <span>권장 대비율</span>
            <strong className="text-slate-700">{issue.thresholdValue || "—"}</strong>
          </div>

          <div className="h-[3px] rounded-[3px] bg-[#efeff2]">
            <span
              className="block h-full rounded-[inherit] bg-[#ff5963]"
              style={{ width: `${barPercent}%` }}
            />
          </div>
        </section>
      )}

      <section className={cardClasses}>
        <h3 className="mt-0 mb-3 text-[11px] font-semibold text-slate-400">위치 정보</h3>

        <IssueLocationTable issue={issue} />
        {formatIssueLineRange(issue) && (
          <p className="mt-2 mb-0 text-[10px] text-slate-400">{formatIssueLineRange(issue)}</p>
        )}

        {issue.originalCodeBlock && (
          <pre className="mt-2 overflow-x-auto border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[10px] leading-4 whitespace-pre-wrap text-slate-500">
            {issue.originalCodeBlock}
          </pre>
        )}
      </section>

      <section className={cardClasses}>
        <h3 className="mt-0 mb-3 text-[12px] font-semibold text-point">✦ AI 추천 개선안</h3>

        {issue.suggestion ? (
          <p className="mt-0 mb-3 text-[10px] leading-[1.6] text-slate-400">{issue.suggestion}</p>
        ) : (
          <p className="mt-0 mb-3 text-[10px] leading-[1.6] text-slate-400">
            이 이슈에 대한 개선안이 제공되지 않았습니다. 위치 정보를 확인해 코드를 직접 수정해
            주세요.
          </p>
        )}

        <Button
          variant="point"
          disabled
          title="AI 자동 수정은 아직 제공되지 않습니다. 코드 직접 수정을 이용해 주세요."
          className="h-[33px] w-full rounded text-[12px]"
        >
          ✦ AI 수정 실행
        </Button>

        <button
          type="button"
          onClick={onEditInCode}
          disabled={!onEditInCode || !issue.targetFilePath}
          className="mt-[5px] h-[33px] w-full cursor-pointer rounded border-0 bg-transparent text-[12px] font-medium text-[#a4a5ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-point"
        >
          코드 직접 수정
        </button>
      </section>

      <div className="overflow-hidden rounded-[14px] border border-[#e8e6ed] bg-white">
        <button
          type="button"
          onClick={() => setGuideOpen((open) => !open)}
          className="flex h-[38px] w-full items-center justify-between bg-transparent px-[15px] text-[11px] font-semibold text-[#53555d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-point"
        >
          관련 가이드
          <span
            className={[
              "inline-flex h-3 w-3 shrink-0 text-[0px] text-[#17181c] transition-transform duration-150 after:block after:h-2 after:w-2 after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-current after:content-['']",
              guideOpen ? "rotate-0" : "-rotate-90",
            ].join(" ")}
            aria-hidden="true"
          />
        </button>

        {guideOpen && (
          <p className="mt-0 px-[15px] pb-3 text-[11px] leading-4 text-slate-400">
            WCAG {issue.code} — {issue.title}
          </p>
        )}
      </div>
    </div>
  );
}
