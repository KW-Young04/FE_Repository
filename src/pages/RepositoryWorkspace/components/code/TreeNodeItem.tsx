import { useState } from "react";

import type { TreeItem } from "../../types";
import { ChevronIcon, FileIcon, FolderIcon } from "./icons";

interface TreeNodeItemProps {
  item: TreeItem;
  activePath: string | null;
  onFileClick: (path: string) => void | Promise<void>;
  depth?: number;
}

export default function TreeNodeItem({
  item,
  activePath,
  onFileClick,
  depth = 0,
}: TreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const paddingLeft = `${depth * 12 + 6}px`;

  if (item.type === "blob") {
    const isActive = activePath === item.path;

    return (
      <button
        type="button"
        className={[
          "flex w-full items-center gap-1.5 rounded px-1.5 py-[3px] text-left text-[12px]",
          isActive
            ? "font-bold text-sky-500"
            : "font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
        ].join(" ")}
        style={{ paddingLeft }}
        onClick={() => {
          void onFileClick(item.path);
        }}
      >
        <FileIcon className="shrink-0 text-slate-400" />
        <span className="truncate">{item.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded px-1.5 py-[3px] text-left text-[12px] font-medium text-slate-700 hover:bg-slate-200/60"
        style={{ paddingLeft }}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <ChevronIcon open={isOpen} className="shrink-0 text-slate-500" />
        <FolderIcon className="shrink-0 text-sky-400" />
        <span className="truncate">{item.name}</span>
      </button>

      {isOpen &&
        item.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            item={child}
            activePath={activePath}
            onFileClick={onFileClick}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
