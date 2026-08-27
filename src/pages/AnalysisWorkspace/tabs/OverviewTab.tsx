import { mockIssues } from '../mockIssues';

import type { AccessibilityIssue } from '@/types/accessibility';

import BrowserToolbar from '../components/BrowserToolbar';
import IssueCard from '../components/IssueCard';

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

export default function OverviewTab() {
  const analysisIssues = mockIssues;

  const topIssues =
    getTopIssues(analysisIssues);

  return (
    <main className="flex min-w-0 flex-col overflow-hidden bg-white">
      <BrowserToolbar />

      <section
        className="relative min-h-0 flex-auto overflow-hidden bg-[#f0f2f5]"
        aria-label="연결된 GitHub 프로젝트 미리보기"
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
  );
}