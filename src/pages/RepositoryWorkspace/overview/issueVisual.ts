import type { AccessibilityIssue, WcagLevel } from "../types";

export type IssueSeverity = "critical" | "warning" | "notice";

const LEVEL_SEVERITY: Record<WcagLevel, IssueSeverity> = {
  A: "critical",
  AA: "warning",
  AAA: "notice",
};

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 3,
  warning: 2,
  notice: 1,
};

export function issueSeverity(issue: AccessibilityIssue): IssueSeverity {
  return LEVEL_SEVERITY[issue.level];
}

export function issueGuideline(issue: AccessibilityIssue): string {
  return `WCAG ${issue.code}`;
}

export function getTopIssues(issues: AccessibilityIssue[], limit = 3): AccessibilityIssue[] {
  return [...issues]
    .sort((a, b) => SEVERITY_RANK[issueSeverity(b)] - SEVERITY_RANK[issueSeverity(a)])
    .slice(0, limit);
}
