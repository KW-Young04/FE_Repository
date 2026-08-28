import type { LoadedFile, TreeItem } from "../../types";
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
}: CodeTabViewProps) {
  return (
    <>
      <ExplorerSidebar
        treeItems={treeItems}
        activePath={activePath}
        truncatedCount={truncatedCount}
        isBackgroundLoading={isBackgroundLoading}
        onFileClick={onFileClick}
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
        />
      </main>
    </>
  );
}
