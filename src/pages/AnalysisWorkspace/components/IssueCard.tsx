import type { AccessibilityIssue } from '@/types/accessibility';

interface IssueCardProps {
  issue: AccessibilityIssue;
  rank: number;
}

export default function IssueCard({
  issue,
  rank,
}: IssueCardProps) {
  const tone =
    issue.severity === 'critical'
      ? 'danger'
      : issue.severity === 'warning'
        ? 'warning'
        : 'notice';

  const severityText =
    issue.severity === 'critical'
      ? '심각'
      : issue.severity === 'warning'
        ? '경고'
        : '주의';

  return (
    <article
      className={`issue-card issue-card--${tone}`}
    >
      <div className="issue-card__top">
        <span className="issue-rank">
          {rank}
        </span>

        <h3>{issue.title}</h3>

        <span className="issue-severity">
          {severityText}
        </span>
      </div>

      <p>
        {issue.description}
      </p>

      <span className="issue-guideline">
        {issue.guideline}
      </span>
    </article>
  );
}