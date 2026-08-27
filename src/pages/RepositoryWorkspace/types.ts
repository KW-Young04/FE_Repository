import type { RepositoryTreeResponse } from "@/api/repository";
import type { SnapshotCaptureStatus } from "@/preview-capture/types";

export type WorkspaceTab = "overview" | "design" | "code";

export type PreviewStatus = "idle" | "loading" | "ready" | "error";

export type IssueStatus = "in_progress" | "complete" | "pending";

export interface AccessibilityIssue {
  id: string;
  code: string;
  title: string;
  level: "A" | "AA";
  status: IssueStatus;
  category: string;
  summary: string;
}

export interface AccessibilityCategoryGroup {
  id: string;
  label: string;
  legendColor: string;
  issues: AccessibilityIssue[];
}

export interface AccessibilityScoreCategory {
  id: string;
  label: string;
  color: string;
  score: number;
}

export interface AccessibilityScoreSummary {
  totalScore: number;
  maxScore?: number;
  categories: AccessibilityScoreCategory[];
}

export interface ScoreChartSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface VisualDesignValues {
  position: "static" | "relative" | "absolute" | "fixed";
  alignment: "left" | "center" | "right" | "justify";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  opacity: number;
  borderRadius: number;
  textColor: string;
  textColorOpacity: number;
  backgroundColor: string;
  fillOpacity: number;
  borderColor: string;
  strokeOpacity: number;
  borderWidth: number;
  dropShadow: boolean;
  effectType: "drop-shadow" | "inner-shadow" | "layer-blur";
  effectOpacity: number;
}
export interface SelectedPreviewElement {
  id: string;
  /** 서빙 HTML에 심어둔 data-codee-id. 코드 되돌려 쓰기의 앵커. 없으면 null(코드 반영 불가). */
  sourceId: number | null;
  selector: string;
  tagName: string;
  className: string;
  idName: string;
}
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
  onFileClick: (path: string) => void | Promise<void>;
  onCloseTab: (path: string) => void;
  onEditorChange: (nextValue: string | undefined) => void;
  onRestartPreview: () => void | Promise<void>;
  onDesignPatch: (sourceId: number | null, css: Record<string, string>) => void;
  onNavigateToConnect: () => void;
}
