import type {
  AccessibilityIssue,
  IssueSeverity,
} from '@/types/accessibility';

interface IssueCardProps {
  issue: AccessibilityIssue;
  rank: number;
}

const toneClasses: Record<
  IssueSeverity,
  {
    card: string;
    rank: string;
    severity: string;
    guideline: string;
  }
> = {
  critical: {
    card:
      'border border-[#ff9b9f] bg-[#fff7f7] [&_code]:font-[inherit] [&_code]:text-[9px] [&_code]:text-[#ff5e65]',
    rank: 'bg-[#f83742]',
    severity: 'bg-[#ffe1e2] text-[#ff4e59]',
    guideline: 'border-[#ffb0b4] text-[#ff5962]',
  },
  warning: {
    card:
      'bg-[#fff8ef] [&_code]:font-[inherit] [&_code]:text-[9px] [&_code]:text-[#ff5e65]',
    rank: 'bg-[#ff941a]',
    severity: 'bg-[#fff0d9] text-[#f28a16]',
    guideline: 'border-[#ffc975] text-[#e4930d]',
  },
  notice: {
    card:
      'bg-[#fffaf0] [&_code]:font-[inherit] [&_code]:text-[9px] [&_code]:text-[#ff5e65]',
    rank: 'bg-[#ffbf11]',
    severity: 'bg-[#fff1bf] text-[#c58e00]',
    guideline: 'border-[#ffc975] text-[#e4930d]',
  },
};

export default function IssueCard({
  issue,
  rank,
}: IssueCardProps) {
  const tone = toneClasses[issue.severity];

  const severityText =
    issue.severity === 'critical'
      ? '심각'
      : issue.severity === 'warning'
        ? '경고'
        : '주의';

  return (
    <article
      className={[
        'min-h-34.75 min-w-0 rounded-[14px] px-3.25 py-3.5',
        tone.card,
      ].join(' ')}
    >
      <div className="grid min-w-0 grid-cols-[23px_minmax(0,1fr)_auto] items-center gap-2">
        <span
          className={[
            'grid h-4.75 w-4.75 place-items-center rounded-full text-[10px] font-extrabold text-white',
            tone.rank,
          ].join(' ')}
        >
          {rank}
        </span>

        <h3 className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-[750]">
          {issue.title}
        </h3>

        <span
          className={[
            'rounded-[9px] px-1.25 py-0.5 text-[8px] font-[750]',
            tone.severity,
          ].join(' ')}
        >
          {severityText}
        </span>
      </div>

      <p className="mt-3.5 mb-2.5 min-h-9.75 text-[9.5px] leading-[1.55] text-slate-600">
        {issue.description}
      </p>

      <span
        className={[
          'inline-flex rounded-lg border px-1.5 py-0.75 text-[8px] font-[650]',
          tone.guideline,
        ].join(' ')}
      >
        {issue.guideline}
      </span>
    </article>
  );
}