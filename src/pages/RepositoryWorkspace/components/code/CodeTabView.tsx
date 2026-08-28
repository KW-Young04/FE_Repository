import type { LoadedFile, PreviewStatus, TreeItem } from "../../types";
import { buildPreviewSrc } from "../../utils/previewSrc";
import PreviewFrame from "../preview/PreviewFrame";
import EditorPanel from "./EditorPanel";
import FileTreePanel from "./FileTreePanel";

interface CodeTabViewProps {
  treeItems: TreeItem[];
  filesByPath: Record<string, LoadedFile>;
  openPaths: string[];
  activePath: string | null;
  activeFile: LoadedFile | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  previewStatus: PreviewStatus;
  previewUrl: string;
  previewRevision: number;
  runtimeError: string | null;
  loadError: string | null;
  loadingMessage: string;
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
  previewStatus,
  previewUrl,
  previewRevision,
  runtimeError,
  loadError,
  loadingMessage,
  runtimeLog,
  isRestarting,
  onFileClick,
  onCloseTab,
  onEditorChange,
  onRestartPreview,
}: CodeTabViewProps) {
  const previewSrc = buildPreviewSrc(previewUrl, previewStatus, previewRevision);
  const fileCount = Object.keys(filesByPath).length;
  const placeholderMessage =
    previewStatus === "error"
      ? (runtimeError ?? loadError ?? "프리뷰를 시작하지 못했습니다.")
      : (loadError ?? loadingMessage) || "프리뷰를 준비하고 있습니다.";

  return (
    <>
      <FileTreePanel
        treeItems={treeItems}
        fileCount={fileCount}
        activePath={activePath}
        truncatedCount={truncatedCount}
        isBackgroundLoading={isBackgroundLoading}
        onFileClick={onFileClick}
      />

      <main className="flex min-w-0 flex-1" aria-label="코드 편집 영역">
        <EditorPanel
          openPaths={openPaths}
          filesByPath={filesByPath}
          activePath={activePath}
          activeFile={activeFile}
          onFileClick={onFileClick}
          onCloseTab={onCloseTab}
          onEditorChange={onEditorChange}
        />

        <section
          className="flex w-1/2 min-w-0 shrink-0 flex-col bg-white"
          aria-label="편집 결과 미리보기"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <strong className="text-sm font-bold text-slate-800">미리보기</strong>
            <button
              type="button"
              onClick={() => {
                void onRestartPreview();
              }}
              disabled={isRestarting || fileCount === 0}
              className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {isRestarting ? "재시작 중" : "프리뷰 재시작"}
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-slate-100">
            <PreviewFrame
              previewSrc={previewSrc}
              previewRevision={previewRevision}
              placeholderMessage={placeholderMessage}
              isLoading={previewStatus === "loading"}
            />
          </div>

          <div className="h-28 shrink-0 overflow-auto border-t border-slate-200 bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-200">
            {runtimeLog.length === 0
              ? "로그가 없습니다."
              : runtimeLog.slice(-40).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          </div>
        </section>
      </main>
    </>
  );
}
