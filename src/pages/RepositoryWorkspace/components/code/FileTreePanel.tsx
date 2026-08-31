import type { TreeItem } from "../../types";
import TreeNodeItem from "./TreeNodeItem";

interface FileTreePanelProps {
  treeItems: TreeItem[];
  activePath: string | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  onFileClick: (path: string) => void | Promise<void>;
}

export default function FileTreePanel({
  treeItems,
  activePath,
  truncatedCount,
  isBackgroundLoading,
  onFileClick,
}: FileTreePanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <h3 className="shrink-0 text-[10px] font-bold tracking-[0.08em] text-slate-400">EXPLORER</h3>

      <div className="scrollbar-subtle mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
        {treeItems.length === 0 ? (
          <p className="px-1 py-2 text-[11px] font-medium text-slate-400">
            불러온 파일이 없습니다.
          </p>
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

      {(isBackgroundLoading || truncatedCount > 0) && (
        <div className="shrink-0 pt-1.5">
          {isBackgroundLoading && (
            <p className="text-[10px] font-medium text-violet-600">파일을 불러오는 중입니다.</p>
          )}
          {truncatedCount > 0 && (
            <p className="text-[10px] font-medium text-slate-400">{truncatedCount}개 파일 생략됨</p>
          )}
        </div>
      )}
    </section>
  );
}
