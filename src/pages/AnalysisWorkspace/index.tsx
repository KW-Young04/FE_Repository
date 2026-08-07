import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

import { mockIssues } from './mockIssues';
import type { AccessibilityIssue } from '@/types/accessibility';

type TabKey = 'overview' | 'design' | 'code';
type IssueStatus = 'In Progress' | 'Complete' | 'Pending';

type CheckItem = {
  id: string;
  title: string;
  level: 'A' | 'AA';
  status: IssueStatus;
};

type CheckGroup = {
  id: string;
  title: string;
  items: CheckItem[];
};

const groups: CheckGroup[] = [
  {
    id: 'visual',
    title: '시각 품질 (Visual)',
    items: [
      { id: '1.1.1', title: '텍스트 대체', level: 'A', status: 'In Progress' },
      { id: '3.3.2', title: '레이블 또는 안내', level: 'AA', status: 'Complete' },
      { id: '2.6.8', title: '대상 크기', level: 'A', status: 'Pending' },
      { id: '1.4.3', title: '명도 대비', level: 'AA', status: 'Pending' },
    ],
  },
  {
    id: 'interaction',
    title: '구조/동작 품질 (Interaction)',
    items: [
      { id: '2.3.4', title: 'DOM/시맨틱', level: 'A', status: 'Pending' },
      { id: '2.2.3', title: '폼 속성/자동 완성', level: 'AA', status: 'Pending' },
      { id: '2.4.6', title: '문서 메타 데이터', level: 'A', status: 'Pending' },
    ],
  },
  {
    id: 'ux',
    title: '전체 경험 (UX)',
    items: [
      { id: '1.2.4', title: '일관된 식별', level: 'A', status: 'Pending' },
      { id: '5.7.8', title: '헬프 메커니즘', level: 'AA', status: 'Pending' },
    ],
  },
];


function Icon({
  name,
  size = 16,
}: {
  name: 'overview' | 'design' | 'code' | 'eye' | 'check' | 'refresh' | 'chevron';
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'overview') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (name === 'design' || name === 'eye') {
    return (
      <svg {...common}>
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }

  if (name === 'code') {
    return (
      <svg {...common}>
        <path d="m8 9-3 3 3 3" />
        <path d="m16 9 3 3-3 3" />
        <path d="m14 5-4 14" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === 'refresh') {
    return (
      <svg {...common}>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9A7 7 0 0 1 18 6l2 2" />
        <path d="M17.9 15A7 7 0 0 1 6 18l-2-2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ScoreDonut() {
  return (
    <div className="score-card">
      <h2>웹 접근성 검사 점수</h2>
      <div className="score-card__divider" />
      <div className="score-card__content">
        <div className="score-donut" aria-label="웹 접근성 점수 60점">
          <div className="score-donut__inner">60점</div>
        </div>
        <div className="score-legend">
          <div><span className="legend-dot legend-dot--visual" />시각 품질</div>
          <div><span className="legend-dot legend-dot--structure" />구조/동작 품질</div>
          <div><span className="legend-dot legend-dot--ux" />전체 경험</div>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const [opened, setOpened] = useState<Record<string, boolean>>({
    visual: true,
    interaction: true,
    ux: true,
  });

  return (
    <aside className="analysis-sidebar">
      <div className="analysis-sidebar__scroll">
        <ScoreDonut />

        <h3 className="sidebar-title">상세보기</h3>

        {groups.map((group) => (
          <section className="check-group" key={group.id}>
            <button
              type="button"
              className="check-group__header"
              onClick={() =>
                setOpened((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))
              }
              aria-expanded={opened[group.id]}
            >
              <span className={opened[group.id] ? 'group-arrow is-open' : 'group-arrow'}>
                <Icon name="chevron" size={13} />
              </span>
              <span>{group.title}</span>
            </button>

            {opened[group.id] && (
              <div className="check-group__items">
                {group.items.map((item) => (
                  <button
                    type="button"
                    className="check-row"
                    key={item.id}
                  >
                    <span className="check-row__name">
                      <small>{item.id}</small>
                      <strong>{item.title}</strong>
                    </span>
                    <span className="check-row__level">{item.level}</span>
                    <span className={`check-row__status status-${item.status.toLowerCase().replace(' ', '-')}`}>
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <button className="recheck-button" type="button">
        <Icon name="refresh" size={17} />
        웹 접근성 재검사
      </button>
    </aside>
  );
}

function AppHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}) {
  return (
    <header className="workspace-header">
      <div className="brand">
        <img src="/codee.png" alt="" className="brand__icon"/>
        <img src="/codee-text.png" alt="codee" className="brand__text"/>
      </div>

      <nav className="workspace-tabs" aria-label="분석 결과 보기">
        <button
          type="button"
          className={activeTab === 'overview' ? 'workspace-tab is-active' : 'workspace-tab'}
          onClick={() => onTabChange('overview')}
        >
          <Icon name="overview" size={15} />
          Overview
        </button>
        <button
          type="button"
          className={activeTab === 'design' ? 'workspace-tab is-active' : 'workspace-tab'}
          onClick={() => onTabChange('design')}
        >
          <Icon name="design" size={15} />
          Design
        </button>
        <button
          type="button"
          className={activeTab === 'code' ? 'workspace-tab is-active' : 'workspace-tab'}
          onClick={() => onTabChange('code')}
        >
          <Icon name="code" size={15} />
          Code
        </button>
      </nav>

      <button type="button" className="commit-button">
        <Icon name="check" size={17} />
        Commit
      </button>
    </header>
  );
}

function BrowserToolbar() {
  return (
    <div className="browser-toolbar">
      <div className="browser-actions" aria-hidden="true">
        <span className="browser-arrow">←</span>
        <span className="browser-arrow is-disabled">→</span>
        <span className="browser-reload">↻</span>
      </div>
      <div className="browser-address">https://www.figma.com/design/</div>
      <button type="button" className="error-toggle">
        <span className="error-toggle__switch" />
        오류 표시
      </button>
    </div>
  );
}

function IssueCard({
  issue,
  rank,
}: {
  issue: AccessibilityIssue;
  rank: number;
}) {
  const tone =
    issue.severity === 'critical'
      ? 'danger'
      : issue.severity === 'warning'
        ? 'warning'
        : 'notice';

  const severityText =
    issue.severity === 'critical'
      ? '심각'
      : issue.severity === 'warning'
        ? '경고'
        : '주의';

  return (
    <article className={`issue-card issue-card--${tone}`}>
      <div className="issue-card__top">
        <span className="issue-rank">{rank}</span>

        <h3>{issue.title}</h3>

        <span className="issue-severity">
          {severityText}
        </span>
      </div>

      <p>{issue.description}</p>

      <span className="issue-guideline">
        {issue.guideline}
      </span>
    </article>
  );
}

function IssueDetailPanel() {
  return (
    <aside className="issue-detail-panel">
      <h2>선택한 이슈</h2>

      <section className="selected-issue-card">
        <div className="selected-issue-card__header">
          <span className="selected-issue-icon">AA</span>
          <div>
            <strong>색상 대비 실패</strong>
            <p>텍스트와 배경의 대비가<br />기준보다 낮습니다.</p>
          </div>
          <span className="fail-badge">FAIL</span>
        </div>
      </section>

      <section className="contrast-card">
        <div className="contrast-row">
          <span>현재 대비율 <em>(문제됨)</em></span>
          <strong>1 : 1</strong>
        </div>
        <div className="contrast-row">
          <span>권장 대비 <em>(문제됨)</em></span>
          <strong>1 (AA)</strong>
        </div>
        <div className="contrast-meter">
          <span />
        </div>
      </section>

      <section className="location-card">
        <h3>위치 정보</h3>
        <div><code>Header.tsx</code><code>.hero_text h1</code></div>
        <div><code>Header.tsx</code><code>br</code></div>
      </section>

      <section className="ai-fix-card">
        <h3>✦ AI 추천 개선안</h3>
        <strong>권장 수정값</strong>
        <div className="color-value">
          <span>현재 색상</span>
          <span><i className="color-dot color-dot--current" />#767676</span>
        </div>
        <div className="color-value">
          <span>권장 색상</span>
          <span className="recommended"><i className="color-dot color-dot--recommended" />#595959</span>
        </div>
        <div className="expected-ratio">
          <span>예상 대비율</span>
          <strong>7.0 : 1 ✓</strong>
        </div>
        <p>텍스트 색상을 더 어둡게 조정하면<br />AA·AAA 기준을 모두 충족할 수 있습니다.</p>
        <button type="button">✦ AI 수정 실행</button>
        <button type="button" className="direct-edit">코드 직접 수정</button>
      </section>

      <button type="button" className="guide-button">
        관련 가이드
        <span>⌄</span>
      </button>
    </aside>
  );
}

const severityPriority = {
  critical: 3,
  warning: 2,
  notice: 1,
};

function getTopIssues(
  issues: AccessibilityIssue[]
): AccessibilityIssue[] {
  return [...issues]
    .sort(
      (a, b) =>
        severityPriority[b.severity] -
        severityPriority[a.severity]
    )
    .slice(0, 3);
}

export default function AnalysisWorkspacePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const analysisIssues = mockIssues;
  const topIssues = getTopIssues(analysisIssues);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);

    if (tab === 'design') {
      navigate('/analysis-workspace/design');
    }
    if (tab === 'code') {
      navigate('/analysis-workspace/code');
    }
  };

  return (
    <div className="analysis-workspace">
      <AppHeader activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="analysis-layout">
        <Sidebar />

        <main className="overview-main">
          <BrowserToolbar />

          <section className="website-preview" aria-label="연결된 GitHub 프로젝트 미리보기">
            <div className="preview-state">
                <div className="preview-spinner" />

                <strong>프로젝트를 실행하고 있습니다.</strong>
                <p>연결한 GitHub 저장소의 웹사이트를 준비하는 중입니다.</p>
            </div>
          </section>

          <section className="top-issues">
            <div className="top-issues__heading">
              <h2>주요 이슈 Top3</h2>
              <span>총 {analysisIssues.length}개 항목 검사</span>
            </div>
            <div className="top-issues__grid">
              {topIssues.map((issue, index) => (
                <IssueCard 
                    key={issue.id}
                    issue={issue}
                    rank={index + 1}
                 />
              ))}
            </div>
          </section>
        </main>

        <IssueDetailPanel />
      </div>
    </div>
  );
}
