import { useState } from "react";

import type { GitFileChangeResponse } from "@/api/git";

import { COMMIT_GRAPH, WORKSPACE_BRANCHES } from "../../data/codeWorkspace";
import type { BranchItem, TreeItem } from "../../types";
import BranchListSection from "./BranchListSection";
import CommitGraphSection from "./CommitGraphSection";
import FileTreePanel from "./FileTreePanel";
import GitChangesSection from "./GitChangesSection";

interface ExplorerSidebarProps {
  treeItems: TreeItem[];
  activePath: string | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  onFileClick: (path: string) => void | Promise<void>;
  /** Git 연동 정보. 없으면 목업 브랜치와 커밋 그래프로 대체한다. */
  branches?: BranchItem[];
  currentBranch?: string;
  changedFiles?: GitFileChangeResponse[];
  selectedPaths?: string[];
  diffPath?: string | null;
  isGitLoading?: boolean;
  gitError?: string | null;
  onToggleChangeSelect?: (path: string) => void;
  onSelectAllChanges?: (selected: boolean) => void;
  onOpenDiff?: (path: string) => void | Promise<void>;
  onRefreshGit?: () => void | Promise<void>;
}

type ExplorerBottomTab = "changes" | "graph";

export default function ExplorerSidebar({
  treeItems,
  activePath,
  truncatedCount,
  isBackgroundLoading,
  onFileClick,
  branches,
  currentBranch,
  changedFiles,
  selectedPaths = [],
  diffPath = null,
  isGitLoading = false,
  gitError = null,
  onToggleChangeSelect,
  onSelectAllChanges,
  onOpenDiff,
  onRefreshGit,
}: ExplorerSidebarProps) {
  const isGitConnected = Boolean(onRefreshGit);
  const [bottomTab, setBottomTab] = useState<ExplorerBottomTab>(
    isGitConnected ? "changes" : "graph",
  );
  const [fallbackBranchId, setFallbackBranchId] = useState(WORKSPACE_BRANCHES[0].id);

  const branchItems = branches?.length ? branches : WORKSPACE_BRANCHES;
  const selectedBranchId = branches?.length ? (currentBranch ?? "") : fallbackBranchId;

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

      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-200">
        {isGitConnected && (
          <div
            className="flex shrink-0 items-center gap-3 px-3 pt-2"
            role="tablist"
            aria-label="Git 패널 탭"
          >
            {(
              [
                { id: "changes", label: "CHANGES" },
                { id: "graph", label: "GRAPH" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={bottomTab === tab.id}
                onClick={() => setBottomTab(tab.id)}
                className={[
                  "text-[10px] font-bold tracking-[0.08em]",
                  bottomTab === tab.id ? "text-violet-600" : "text-slate-400 hover:text-slate-600",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {isGitConnected && bottomTab === "changes" ? (
          <GitChangesSection
            changedFiles={changedFiles ?? []}
            selectedPaths={selectedPaths}
            diffPath={diffPath}
            isLoading={isGitLoading}
            error={gitError}
            onToggleSelect={onToggleChangeSelect ?? (() => {})}
            onSelectAll={onSelectAllChanges ?? (() => {})}
            onOpenDiff={onOpenDiff ?? (() => {})}
            onRefresh={onRefreshGit ?? (() => {})}
          />
        ) : (
          <CommitGraphSection commits={COMMIT_GRAPH} />
        )}
      </div>

      <BranchListSection
        branches={branchItems}
        currentBranchId={selectedBranchId}
        onSelectBranch={branches?.length ? () => {} : setFallbackBranchId}
        isReadOnly={Boolean(branches?.length)}
      />
    </aside>
  );
}
