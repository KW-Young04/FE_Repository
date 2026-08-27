export type IssueSeverity = 'critical' | 'warning' | 'notice';

export interface AccessibilityIssue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  guideline: string;
}