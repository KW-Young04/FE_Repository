import { useState } from "react";

import { COMMIT_GRAPH, WORKSPACE_BRANCHES } from "../../data/codeWorkspace";
import type { TreeItem } from "../../types";
import BranchListSection from "./BranchListSection";
import CommitGraphSection from "./CommitGraphSection";
import FileTreePanel from "./FileTreePanel";

interface ExplorerSidebarProps {
  treeItems: TreeItem[];
  activePath: string | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  onFileClick: (path: string) => void | Promise<void>;
}

const DEFAULT_BRANCH_ID =
  WORKSPACE_BRANCHES.find((branch) => branch.isCurrent)?.id ?? WORKSPACE_BRANCHES[0].id;

export default function ExplorerSidebar({
  treeItems,
  activePath,
  truncatedCount,
  isBackgroundLoading,
  onFileClick,
}: ExplorerSidebarProps) {
  const [currentBranchId, setCurrentBranchId] = useState(DEFAULT_BRANCH_ID);

  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-[#FAFAFC]"
      aria-label="탐색기 사이드바"
    >
      <FileTreePanel
        treeItems={treeItems}
        activePath={activePath}
        truncatedCount={truncatedCount}
        isBackgroundLoading={isBackgroundLoading}
        onFileClick={onFileClick}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <CommitGraphSection commits={COMMIT_GRAPH} />
      </div>

      <BranchListSection
        branches={WORKSPACE_BRANCHES}
        currentBranchId={currentBranchId}
        onSelectBranch={setCurrentBranchId}
      />
    </aside>
  );
}
