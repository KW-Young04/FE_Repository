import type { AccessibilityIssue } from "../../types";
import { issueGuideline, issueSeverity, type IssueSeverity } from "../../utils/issueVisual";

interface IssueCardProps {
  issue: AccessibilityIssue;
  rank: number;
  onSelect?: (issueId: string) => void;
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
    card: "border border-[#ff9b9f] bg-[#fff7f7] [&_code]:font-[inherit] [&_code]:text-[11px] [&_code]:text-[#ff5e65]",
    rank: "bg-[#f83742]",
    severity: "bg-[#ffe1e2] text-[#ff4e59]",
    guideline: "border-[#ffb0b4] text-[#ff5962]",
  },
  warning: {
    card: "bg-[#fff8ef] [&_code]:font-[inherit] [&_code]:text-[11px] [&_code]:text-[#ff5e65]",
    rank: "bg-[#ff941a]",
    severity: "bg-[#fff0d9] text-[#f28a16]",
    guideline: "border-[#ffc975] text-[#e4930d]",
  },
  notice: {
    card: "bg-[#fffaf0] [&_code]:font-[inherit] [&_code]:text-[11px] [&_code]:text-[#ff5e65]",
    rank: "bg-[#ffbf11]",
    severity: "bg-[#fff1bf] text-[#c58e00]",
    guideline: "border-[#ffc975] text-[#e4930d]",
  },
};

const SEVERITY_TEXT: Record<IssueSeverity, string> = {
  critical: "심각",
  warning: "경고",
  notice: "주의",
};

export default function IssueCard({ issue, rank, onSelect }: IssueCardProps) {
  const severity = issueSeverity(issue);
  const tone = toneClasses[severity];

  return (
    <button
      type="button"
      onClick={() => onSelect?.(issue.id)}
      className={[
        "min-h-[139px] min-w-0 rounded-[14px] px-[13px] py-3.5 text-left",
        tone.card,
      ].join(" ")}
    >
      <div className="grid min-w-0 grid-cols-[23px_minmax(0,1fr)_auto] items-center gap-2">
        <span
          className={[
            "grid h-[19px] w-[19px] place-items-center rounded-full text-[12px] font-extrabold text-white",
            tone.rank,
          ].join(" ")}
        >
          {rank}
        </span>

        <h3 className="m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-bold">
          {issue.title}
        </h3>

        <span className={["rounded-[9px] px-[5px] py-0.5 text-[10px] font-bold", tone.severity].join(" ")}>
          {SEVERITY_TEXT[severity]}
        </span>
      </div>

      <p className="mt-3.5 mb-2.5 min-h-[39px] text-[11.5px] leading-[1.55] text-slate-600">
        {issue.summary}
      </p>

      <span
        className={[
          "inline-flex rounded-lg border px-1.5 py-[3px] text-[10px] font-semibold",
          tone.guideline,
        ].join(" ")}
      >
        {issueGuideline(issue)}
      </span>
    </button>
  );
}
