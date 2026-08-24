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
      <main className="design-main">
        <BrowserToolbar />

        <section
          className="design-preview"
          aria-label="디자인 편집 미리보기"
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

          {/*
            나중에 실제 previewUrl이 들어오면
            위 preview-state 대신 아래 iframe 사용

            <iframe
              src={previewUrl}
              title="프로젝트 디자인 미리보기"
              className="design-preview__iframe"
            />
          */}

          {/* 접근성 문제 영역 표시 예시 */}
          <div className="design-issue-overlay design-issue-overlay--hero">
            <span className="design-issue-label">
              <strong>A</strong>
              1.1.2 대비 실패
            </span>
          </div>

          <div className="design-issue-overlay design-issue-overlay--button">
            <span className="design-issue-label">
              <strong>AA</strong>
              1.1.3 크기 실패
            </span>
          </div>
        </section>

        <section className="top-issues">
          <div className="top-issues__heading">
            <h2>주요 이슈 Top3</h2>

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

      <DesignToolPanel />
    </>
  );
}