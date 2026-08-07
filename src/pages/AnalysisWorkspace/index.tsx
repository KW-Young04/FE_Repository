import { useState } from 'react';

import './style.css';

import type { TabKey } from './types';

import WorkspaceHeader from './components/WorkspaceHeader';
import AnalysisSidebar from './components/AnalysisSidebar';
import IssueDetailPanel from './components/IssueDetailPanel';

import OverviewTab from './tabs/OverviewTab';
import DesignTab from './tabs/DesignTab';
import CodeTab from './tabs/CodeTab';

export default function AnalysisWorkspacePage() {
  const [activeTab, setActiveTab] =
    useState<TabKey>('overview');

  return (
    <div className="analysis-workspace">
      <WorkspaceHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="analysis-layout">
        <AnalysisSidebar />

        {activeTab === 'overview' && (
          <OverviewTab />
        )}

        {activeTab === 'design' && (
          <DesignTab />
        )}

        {activeTab === 'code' && (
          <CodeTab />
        )}

        <IssueDetailPanel />
      </div>
    </div>
  );
}