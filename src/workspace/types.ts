import type { RepositoryTreeResponse } from "@/api/repository";
import type { SnapshotCaptureStatus } from "@/preview-capture/types";

export type PreviewStatus = "idle" | "loading" | "ready" | "error";

export interface LoadedFile {
  path: string;
  content: string;
  encoding?: "utf-8" | "base64" | string;
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
  branchName: string;
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
  snapshotCaptureStatus: SnapshotCaptureStatus;
  analysisResultId: number | null;
  isRestarting: boolean;
  /** 정적 HTML 프리뷰에서 디자인 변경을 소스 코드로 반영할 수 있는지 여부 */
  designWriteEnabled: boolean;
  /** 사용자 코드 수정(에디터/디자인 writeback)이 발생할 때마다 증가한다. */
  contentEditGeneration: number;
  onFileClick: (path: string) => void | Promise<void>;
  onCloseTab: (path: string) => void;
  onEditorChange: (nextValue: string | undefined) => void;
  onFlushPendingWrites: () => Promise<void>;
  onRestartPreview: () => void | Promise<void>;
  onDesignPatch: (sourceId: number | null, css: Record<string, string>) => void;
  onNavigateToConnect: () => void;
}
