import type { TreeItem } from "../types";
import TreeNodeItem from "./TreeNodeItem";

interface FileTreePanelProps {
  treeItems: TreeItem[];
  fileCount: number;
  activePath: string | null;
  onFileClick: (path: string) => void | Promise<void>;
}

export default function FileTreePanel({ treeItems, fileCount, activePath, onFileClick }: FileTreePanelProps) {
  return (
    <aside className="col-span-2 flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 py-2 text-sm font-bold text-slate-800">
        파일 트리 ({fileCount})
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {treeItems.map((item) => (
          <TreeNodeItem key={item.path} item={item} activePath={activePath} onFileClick={onFileClick} />
        ))}
      </div>
    </aside>
  );
}
