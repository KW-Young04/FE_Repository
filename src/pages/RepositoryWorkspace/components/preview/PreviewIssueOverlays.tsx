import type { AccessibilityIssue } from "../../types";

interface PreviewIssueOverlaysProps {
  issues: AccessibilityIssue[];
}

const OVERLAY_LAYOUT = [
  "absolute top-[145px] left-[10%] h-[310px] w-[80%]",
  "absolute right-0 bottom-[10px] h-[110px] w-[150px]",
] as const;

export default function PreviewIssueOverlays({ issues }: PreviewIssueOverlaysProps) {
  const visible = issues.slice(0, 2);

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((issue, index) => (
        <div
          key={issue.id}
          className={`pointer-events-none rounded-2xl border-[1.5px] border-dashed border-[#ff5656] ${OVERLAY_LAYOUT[index]}`}
        >
          <span className="absolute top-[-39px] left-3 flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[9px] bg-[#ff9aa0] px-3 text-xs font-bold text-[#8d1f26]">
            <strong className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff3845] px-1 text-[10px] text-white">
              {issue.level}
            </strong>
            {issue.code} {issue.title}
          </span>
        </div>
      ))}
    </>
  );
}
