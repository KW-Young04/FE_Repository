import { useState } from "react";
import type { TreeItem } from "../types";

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
  const padding = `${depth * 12 + 8}px`;

  if (item.type === "blob") {
    return (
      <button
        type="button"
        className={[
          "flex w-full items-center rounded px-2 py-1 text-left text-xs font-medium",
          activePath === item.path
            ? "bg-sky-100 text-sky-700"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        ].join(" ")}
        style={{ paddingLeft: padding }}
        onClick={() => {
          void onFileClick(item.path);
        }}
      >
        {item.name}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center rounded px-2 py-1 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100"
        style={{ paddingLeft: padding }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="mr-1 text-[10px]">{isOpen ? "▼" : "▶"}</span>
        {item.name}
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
