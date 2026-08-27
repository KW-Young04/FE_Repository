import BrowserToolbar from '../components/BrowserToolbar';
import IssueCard from '../components/IssueCard';
import DesignToolPanel from '../components/DesignToolPanel';

import { mockIssues } from '../mockIssues';

import type { AccessibilityIssue } from '@/types/accessibility';

const severityPriority = {
  critical: 3,
  warning: 2,
  notice: 1,
};

function getTopIssues(
  issues: AccessibilityIssue[],
): AccessibilityIssue[] {
  return [...issues]
    .sort(
      (a, b) =>
        severityPriority[b.severity] -
        severityPriority[a.severity],
    )
    .slice(0, 3);
}

export default function DesignTab() {
  const analysisIssues = mockIssues;

  const topIssues =
    getTopIssues(analysisIssues);

  return (
    <>
      <main className="h-full min-w-0 overflow-y-auto bg-white">
        <BrowserToolbar />

        <section
          className="relative h-155 w-full overflow-hidden border-b border-[#e6e7ec] bg-white"
          aria-label="디자인 편집 미리보기"
        >
          <div className="flex h-full min-h-105 w-full flex-col items-center justify-center gap-2.5 bg-[#f8f8fb] text-center">
            <div className="h-7.5 w-7.5 rounded-full border-[3px] border-[#e2dcff] border-t-[#6d3df5] [animation:spin_0.8s_linear_infinite]" />

            <strong className="text-base font-bold text-[#202124]">
              프로젝트를 실행하고 있습니다.
            </strong>

            <p className="m-0 text-[13px] text-[#8b8d98]">
              연결한 GitHub 저장소의 웹사이트를
              준비하는 중입니다.
            </p>
          </div>

          {/*
            나중에 실제 previewUrl이 들어오면
            위 preview-state 대신 아래 iframe 사용

            <iframe
              src={previewUrl}
              title="프로젝트 디자인 미리보기"
              className="block h-full w-full border-0 bg-white"
            />
          */}

          {/* 접근성 문제 영역 표시 예시 */}
          <div className="pointer-events-none absolute top-[145px] left-[10%] h-77.5 w-[80%] rounded-2xl border-[1.5px] border-dashed border-[#ff5656]">
            <span className="absolute top-[-39px] left-3 flex h-8.5 items-center gap-1.75 whitespace-nowrap rounded-[9px] bg-[#ff9aa0] px-3 text-xs font-bold text-[#8d1f26]">
              <strong className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3845] px-1 text-[10px] text-white">
                A
              </strong>
              1.1.2 대비 실패
            </span>
          </div>

          <div className="pointer-events-none absolute right-0 bottom-[10px] h-27.5 w-37.5 rounded-2xl border-[1.5px] border-dashed border-[#ff5656]">
            <span className="absolute top-[-39px] left-3 flex h-8.5 items-center gap-1.75 whitespace-nowrap rounded-[9px] bg-[#ff9aa0] px-3 text-xs font-bold text-[#8d1f26]">
              <strong className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3845] px-1 text-[10px] text-white">
                AA
              </strong>
              1.1.3 크기 실패
            </span>
          </div>
        </section>

        <section className="flex-[0_0_239px] border-t border-slate-200 bg-white px-4.25 pt-9.25 pb-3">
          <div className="mb-3.25 flex items-center justify-between">
            <h2 className="m-0 text-[11px] font-[760] text-slate-900">
              주요 이슈 Top3
            </h2>

            <span className="text-[9px] text-slate-400">
              총 {analysisIssues.length}개 항목 검사
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.75">
            {topIssues.map(
              (issue, index) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  rank={index + 1}
                />
              ),
            )}
          </div>
        </section>
      </main>

      <DesignToolPanel />
    </>
  );
}