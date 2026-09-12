export type {
  LoadDiagnostics,
  LoadedFile,
  PreviewStatus,
  RepositoryWorkspaceViewProps,
  TreeItem,
} from "@/workspace/types";

export type WorkspaceTab = "overview" | "design" | "code";

export type IssueStatus = "in_progress" | "complete" | "pending";

export type WcagLevel = "A" | "AA" | "AAA";

export interface AccessibilityIssue {
  id: string;
  code: string;
  title: string;
  level: WcagLevel;
  status: IssueStatus;
  category: string;
  summary: string;
  targetFilePath?: string;
  targetSelector?: string;
  /** 원본 파일 기준 1-based 줄 번호. 저장된 분석에는 없을 수 있다. */
  startLine?: number;
  endLine?: number;
  originalCodeBlock?: string;
  suggestion?: string;
  measuredValue?: string;
  thresholdValue?: string;
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
export interface CommitNode {
  id: string;
  message: string;
  author: string;
  branch: string;
  color: string;
  /** 현재 체크아웃된 커밋. 그래프에서 속이 빈 원으로 표시한다. */
  isHead?: boolean;
}

export interface BranchItem {
  id: string;
  name: string;
  color: string;
  isCurrent?: boolean;
}

export type ProblemSeverity = "error" | "warning" | "info";

export interface ProblemItem {
  id: string;
  severity: ProblemSeverity;
  message: string;
  source: string;
  line: number;
  column: number;
}

export interface ProblemFileGroup {
  path: string;
  problems: ProblemItem[];
}

export type BottomPanelTab = "problems" | "gitDiff" | "output" | "debug" | "terminal";

/** AI 제안본과 원본의 차이. 에디터에서 줄 단위 배경색으로 표시한다. */
export interface AiDiffLines {
  removed: number[];
  added: number[];
}

