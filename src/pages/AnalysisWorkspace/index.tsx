import { useState } from 'react';

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
    <div className="min-h-screen min-w-295 overflow-hidden bg-white text-[#202124]">
      <WorkspaceHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="grid h-[calc(100vh-42px)] min-h-175 grid-cols-[298px_minmax(650px,1fr)_248px] max-[1360px]:grid-cols-[270px_minmax(650px,1fr)_225px]">
        <AnalysisSidebar />

        {activeTab === 'overview' && (
          <>
            <OverviewTab />
            <IssueDetailPanel />
          </>
        )}

        {activeTab === 'design' && (
          <DesignTab />
        )}

        {activeTab === 'code' && (
          <CodeTab />
        )}
      </div>
    </div>
  );
}