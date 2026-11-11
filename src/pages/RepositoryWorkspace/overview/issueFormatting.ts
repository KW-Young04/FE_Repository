import type { AccessibilityIssue } from "../types";

export function formatIssueLineRange(issue: AccessibilityIssue) {
  if (!issue.startLine && !issue.endLine) return "";
  if (issue.startLine && issue.endLine && issue.startLine !== issue.endLine) {
    return `${issue.startLine}–${issue.endLine}행`;
  }
  return `${issue.startLine || issue.endLine}행`;
}
