import type { WorkspaceTab } from "../types";

const WORKSPACE_LAYOUT_GRID_CLASS = {
  preview: "grid-cols-[minmax(620px,1fr)_auto_auto]",
  code: "grid-cols-[minmax(560px,1fr)_auto_auto]",
} as const;

export function getWorkspaceLayoutGridClass(tab: WorkspaceTab) {
  return tab === "code" ? WORKSPACE_LAYOUT_GRID_CLASS.code : WORKSPACE_LAYOUT_GRID_CLASS.preview;
}
