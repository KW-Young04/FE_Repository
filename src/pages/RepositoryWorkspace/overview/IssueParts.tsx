import type { AccessibilityIssue, IssueStatus, WcagLevel } from "../types";

export const issueCardClasses =
  "rounded-[15px] border border-[#e7e5ed] bg-white shadow-[0_1px_2px_rgb(10_10_20/3%)]";

export function IssueLevelBadge({ level, size = "md" }: { level: WcagLevel; size?: "sm" | "md" }) {
  return (
    <span
      className={[
        "grid shrink-0 place-items-center rounded-full bg-[#ff4f5b] font-bold text-white",
        size === "sm" ? "size-[24px] text-[10px]" : "size-[31px] text-[12px]",
      ].join(" ")}
    >
      {level}
    </span>
  );
}

export function IssueResultBadge({ status }: { status: IssueStatus }) {
  return (
    <span className="rounded-[9px] bg-[#ffe3e5] px-1.5 py-[3px] text-[10px] font-extrabold text-[#ff5d66]">
      {status === "complete" ? "PASS" : "FAIL"}
    </span>
  );
}

export function IssueLocationTable({ issue }: { issue: AccessibilityIssue }) {
  return (
    <div className="grid grid-cols-[1fr_1.15fr] border border-slate-200">
      <code
        title={issue.targetFilePath}
        className="overflow-hidden px-2 py-[7px] font-[inherit] text-[10px] text-ellipsis whitespace-nowrap text-slate-500"
      >
        {issue.targetFilePath || "파일 정보 없음"}
      </code>
      <code
        title={issue.targetSelector}
        className="overflow-hidden border-l border-slate-200 px-2 py-[7px] font-[inherit] text-[10px] text-ellipsis whitespace-nowrap text-slate-500"
      >
        {issue.targetSelector || "셀렉터 없음"}
      </code>
    </div>
  );
}
