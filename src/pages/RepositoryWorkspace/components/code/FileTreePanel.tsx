import type { TreeItem } from "../../types";
import TreeNodeItem from "./TreeNodeItem";

interface FileTreePanelProps {
  treeItems: TreeItem[];
  fileCount: number;
  activePath: string | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  onFileClick: (path: string) => void | Promise<void>;
}

export default function FileTreePanel({
  treeItems,
  fileCount,
  activePath,
  truncatedCount,
  isBackgroundLoading,
  onFileClick,
}: FileTreePanelProps) {
  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-[#F7F7FB]"
      aria-label="파일 트리 사이드바"
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3">
        <div className="flex items-center justify-between">
          <strong className="text-sm font-bold text-slate-800">파일</strong>
          <span className="text-xs font-semibold text-slate-500">{fileCount}개</span>
        </div>
        {isBackgroundLoading && (
          <p className="mt-1 text-[11px] font-medium text-violet-600">
            나머지 파일을 불러오는 중입니다.
          </p>
        )}
        {truncatedCount > 0 && (
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            {truncatedCount}개 파일은 목록에서 생략되었습니다.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {treeItems.length === 0 ? (
          <p className="px-2 py-3 text-xs font-medium text-slate-500">불러온 파일이 없습니다.</p>
        ) : (
          treeItems.map((item) => (
            <TreeNodeItem
              key={item.path}
              item={item}
              activePath={activePath}
              onFileClick={onFileClick}
            />
          ))
        )}
      </div>
    </aside>
  );
}
