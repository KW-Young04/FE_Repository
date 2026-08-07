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
    <main className="overview-main">
      <BrowserToolbar />

      <section
        className="website-preview"
        aria-label="연결된 GitHub 프로젝트 미리보기"
      >
        <div className="preview-state">
          <div className="preview-spinner" />

          <strong>
            프로젝트를 실행하고 있습니다.
          </strong>

          <p>
            연결한 GitHub 저장소의 웹사이트를
            준비하는 중입니다.
          </p>
        </div>
      </section>

      <section className="top-issues">
        <div className="top-issues__heading">
          <h2>
            주요 이슈 Top3
          </h2>

          <span>
            총 {analysisIssues.length}개 항목 검사
          </span>
        </div>

        <div className="top-issues__grid">
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