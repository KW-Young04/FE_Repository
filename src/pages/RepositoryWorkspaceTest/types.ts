import type { RepositoryTreeResponse } from "@/api/repository";

export type PreviewStatus = "idle" | "loading" | "ready" | "error";

export interface LoadedFile {
  path: string;
  content: string;
  dirty: boolean;
}

export interface TreeItem {
  name: string;
  path: string;
  type: "tree" | "blob";
  children: TreeItem[];
}

export interface LoadDiagnostics {
  treeMs: number | null;
  coreMs: number | null;
  runtimeMs: number | null;
  backgroundMs: number | null;
  coreFailedPaths: string[];
  backgroundFailedPaths: string[];
  lastError: string | null;
}

export interface RepositoryWorkspaceViewProps {
  repositoryUrl: string;
  tree: RepositoryTreeResponse | null;
  filesByPath: Record<string, LoadedFile>;
  openPaths: string[];
  activePath: string | null;
  activeFile: LoadedFile | null;
  treeItems: TreeItem[];
  loadingMessage: string;
  loadError: string | null;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  diagnostics: LoadDiagnostics;
  previewStatus: PreviewStatus;
  previewUrl: string;
  previewRevision: number;
  previewProjectLabel: string;
  runtimeLog: string[];
  runtimeError: string | null;
  isRestarting: boolean;
  designWriteEnabled: boolean;
  onFileClick: (path: string) => void | Promise<void>;
  onCloseTab: (path: string) => void;
  onEditorChange: (nextValue: string | undefined) => void;
  onRestartPreview: () => void | Promise<void>;
  onDesignPatch: (sourceId: number | null, css: Record<string, string>) => void;
  onNavigateToConnect: () => void;
}
