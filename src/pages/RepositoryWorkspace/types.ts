export type WorkspaceTab = "overview" | "design" | "code";

export type IssueStatus = "in_progress" | "complete" | "pending";

export type IssueCategory = "visual" | "interaction" | "ux";

export type IssueLevel = "A" | "AA";

export interface AccessibilityIssue {
  id: string;
  code: string;
  title: string;
  level: IssueLevel;
  status: IssueStatus;
  category: IssueCategory;
  summary: string;
}

export interface AccessibilityCategoryGroup {
  id: IssueCategory;
  label: string;
  legendColor: string;
  issues: AccessibilityIssue[];
}

export interface AccessibilityScoreSummary {
  totalScore: number;
  maxScore?: number;
  categories: Array<{
    id: IssueCategory;
    label: string;
    color: string;
    score: number;
  }>;
}

export interface ScoreChartSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}
