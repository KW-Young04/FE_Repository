import type { TabKey } from '../types';
import Icon from './Icon';

interface WorkspaceHeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export default function WorkspaceHeader({
  activeTab,
  onTabChange,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="brand">
        <img
          src="/codee.png"
          alt=""
          className="brand__icon"
        />

        <img
          src="/codee-text.png"
          alt="codee"
          className="brand__text"
        />
      </div>

      <nav
        className="workspace-tabs"
        aria-label="분석 결과 보기"
      >
        <button
          type="button"
          className={
            activeTab === 'overview'
              ? 'workspace-tab is-active'
              : 'workspace-tab'
          }
          onClick={() =>
            onTabChange('overview')
          }
        >
          <Icon
            name="overview"
            size={15}
          />
          Overview
        </button>

        <button
          type="button"
          className={
            activeTab === 'design'
              ? 'workspace-tab is-active'
              : 'workspace-tab'
          }
          onClick={() =>
            onTabChange('design')
          }
        >
          <Icon
            name="design"
            size={15}
          />
          Design
        </button>

        <button
          type="button"
          className={
            activeTab === 'code'
              ? 'workspace-tab is-active'
              : 'workspace-tab'
          }
          onClick={() =>
            onTabChange('code')
          }
        >
          <Icon
            name="code"
            size={15}
          />
          Code
        </button>
      </nav>

      <button
        type="button"
        className="commit-button"
      >
        <Icon
          name="check"
          size={17}
        />
        Commit
      </button>
    </header>
  );
}