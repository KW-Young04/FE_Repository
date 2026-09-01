import type { GitFileChangeResponse } from "@/api/git";

import type { BranchItem, LoadedFile, ProblemFileGroup, TreeItem } from "../../types";
import BottomPanel from "./BottomPanel";
import EditorPanel from "./EditorPanel";
import ExplorerSidebar from "./ExplorerSidebar";

interface CodeTabViewProps {
  treeItems: TreeItem[];
  filesByPath: Record<string, LoadedFile>;
  openPaths: string[];
  activePath: string | null;
  activeFile: LoadedFile | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  runtimeError: string | null;
  loadError: string | null;
  runtimeLog: string[];
  isRestarting: boolean;
  onFileClick: (path: string) => void | Promise<void>;
  onCloseTab: (path: string) => void;
  onEditorChange: (nextValue: string | undefined) => void;
  onRestartPreview: () => void | Promise<void>;
  problemGroups?: ProblemFileGroup[];
  isAnalyzing?: boolean;
  analysisError?: string | null;
  branches?: BranchItem[];
  currentBranch?: string;
  changedFiles?: GitFileChangeResponse[];
  selectedPaths?: string[];
  diffPath?: string | null;
  diff?: string | null;
  isDiffLoading?: boolean;
  isGitLoading?: boolean;
  gitError?: string | null;
  onToggleChangeSelect?: (path: string) => void;
  onSelectAllChanges?: (selected: boolean) => void;
  onOpenDiff?: (path: string) => void | Promise<void>;
  onRefreshGit?: () => void | Promise<void>;
}

export default function CodeTabView({
  treeItems,
  filesByPath,
  openPaths,
  activePath,
  activeFile,
  truncatedCount,
  isBackgroundLoading,
  runtimeError,
  loadError,
  runtimeLog,
  isRestarting,
  onFileClick,
  onCloseTab,
  onEditorChange,
  onRestartPreview,
  problemGroups,
  isAnalyzing,
  analysisError,
  branches,
  currentBranch,
  changedFiles,
  selectedPaths,
  diffPath,
  diff,
  isDiffLoading,
  isGitLoading,
  gitError,
  onToggleChangeSelect,
  onSelectAllChanges,
  onOpenDiff,
  onRefreshGit,
}: CodeTabViewProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden bg-white">
      <ExplorerSidebar
        treeItems={treeItems}
        activePath={activePath}
        truncatedCount={truncatedCount}
        isBackgroundLoading={isBackgroundLoading}
        onFileClick={onFileClick}
        branches={branches}
        currentBranch={currentBranch}
        changedFiles={changedFiles}
        selectedPaths={selectedPaths}
        diffPath={diffPath}
        isGitLoading={isGitLoading}
        gitError={gitError}
        onToggleChangeSelect={onToggleChangeSelect}
        onSelectAllChanges={onSelectAllChanges}
        onOpenDiff={onOpenDiff}
        onRefreshGit={onRefreshGit}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="코드 편집 영역">
        <EditorPanel
          openPaths={openPaths}
          filesByPath={filesByPath}
          activePath={activePath}
          activeFile={activeFile}
          onFileClick={onFileClick}
          onCloseTab={onCloseTab}
          onEditorChange={onEditorChange}
        />

        <BottomPanel
          runtimeLog={runtimeLog}
          runtimeError={runtimeError}
          loadError={loadError}
          isRestarting={isRestarting}
          onSelectProblem={onFileClick}
          onRestartPreview={onRestartPreview}
          problemGroups={problemGroups}
          isAnalyzing={isAnalyzing}
          analysisError={analysisError}
          diffPath={diffPath}
          diff={diff}
          isDiffLoading={isDiffLoading}
        />
      </main>
    </div>
  );
}
