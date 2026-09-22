import type { AccessibilityIssue, IssueStatus } from "../../types";

const STATUS_LABEL: Record<IssueStatus, string> = {
  in_progress: "In Progress",
  complete: "Complete",
  pending: "Pending",
};

const STATUS_CLASS: Record<IssueStatus, string> = {
  in_progress: "text-[#008cff]",
  complete: "text-cyan-500",
  pending: "text-[#858791]",
};

interface AccessibilityIssueItemProps {
  issue: AccessibilityIssue;
  occurrences: AccessibilityIssue[];
  isSelected: boolean;
  selectedIssueId: string | null;
  onSelect: (issueId: string) => void;
}

export default function AccessibilityIssueItem({
  issue,
  occurrences,
  isSelected,
  selectedIssueId,
  onSelect,
}: AccessibilityIssueItemProps) {
  const fileGroups = groupOccurrencesByFile(occurrences);

  return (
    <article
      className={["border-t border-[#dedde3] bg-white", isSelected ? "bg-[#fbfaff]" : ""].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSelect(issue.id)}
        className="grid min-h-[52px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_40px_78px] items-center bg-transparent py-2 pr-2 pl-[42px] text-left transition-colors hover:bg-[#fbfbfd] max-[1360px]:grid-cols-[minmax(0,1fr)_34px_70px] max-[1360px]:pl-8"
        aria-current={isSelected ? "true" : undefined}
      >
        <span className="flex min-w-0 flex-col pr-2 leading-tight">
          <small className="text-[11px] font-normal text-[#8b8b8f]">{issue.code}</small>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium text-[#202124]">
            {issue.title}
          </strong>
          {occurrences.length > 1 && (
            <span className="mt-1 text-[10px] font-semibold text-[#8b8b8f]">
              {occurrences.length}개 위치에서 발견
            </span>
          )}
        </span>

        <span className="justify-self-center text-[13px] font-bold text-[#0095ff]">
          {issue.level}
        </span>

        <span
          className={`justify-self-center whitespace-nowrap text-[13px] font-semibold ${STATUS_CLASS[issue.status]}`}
        >
          {STATUS_LABEL[issue.status]}
        </span>
      </button>

      <div className="space-y-1.5 px-2 pb-2 pl-[42px] max-[1360px]:pl-8">
        {fileGroups.map((fileGroup) => (
          <div key={fileGroup.key} className="rounded-md border border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-slate-700">
                {fileGroup.label}
              </span>
              <span className="shrink-0 text-[10px] font-semibold text-[#8b8b8f]">
                {fileGroup.occurrences.length}곳
              </span>
            </div>

            <div className="space-y-1 border-t border-slate-100 px-1.5 py-1.5">
              {fileGroup.occurrences.map((occurrence, index) => (
                <button
                  key={occurrence.id}
                  type="button"
                  onClick={() => onSelect(occurrence.id)}
                  className={[
                    "grid w-full cursor-pointer grid-cols-[30px_minmax(0,1fr)] items-start gap-1.5 rounded border px-1.5 py-1.5 text-left transition-colors",
                    occurrence.id === selectedIssueId
                      ? "border-[#dcd4ff] bg-[#f7f4ff]"
                      : "border-transparent bg-white hover:border-[#dcd4ff] hover:bg-[#fbfaff]",
                  ].join(" ")}
                  aria-current={occurrence.id === selectedIssueId ? "true" : undefined}
                >
                  <span className="text-[10px] font-bold text-[#6d3df5]">#{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold text-slate-600">
                      {formatIssueLocationDetail(occurrence)}
                    </span>
                    <code className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap font-[inherit] text-[10px] text-slate-400">
                      {formatIssueTargetHint(occurrence)}
                    </code>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function groupOccurrencesByFile(occurrences: AccessibilityIssue[]) {
  const groupMap = new Map<
    string,
    { key: string; label: string; occurrences: AccessibilityIssue[] }
  >();

  occurrences.forEach((occurrence) => {
    const key = occurrence.targetFilePath || "unknown";
    const existing = groupMap.get(key);

    if (existing) {
      existing.occurrences.push(occurrence);
      return;
    }

    groupMap.set(key, {
      key,
      label: getDisplayPath(occurrence.targetFilePath) || "파일 정보 없음",
      occurrences: [occurrence],
    });
  });

  return Array.from(groupMap.values());
}

function formatIssueLocationDetail(issue: AccessibilityIssue) {
  const lineRange = formatLineRange(issue);

  if (lineRange) return `${lineRange}행`;
  if (issue.targetSelector) return issue.targetSelector;
  if (issue.originalCodeBlock) return summarizeCodeBlock(issue.originalCodeBlock);
  return "구체 위치 정보 없음";
}

function formatIssueTargetHint(issue: AccessibilityIssue) {
  const lineRange = formatLineRange(issue);

  if (issue.targetSelector) return issue.targetSelector;
  if (issue.originalCodeBlock) return summarizeCodeBlock(issue.originalCodeBlock);
  if (lineRange) return `${lineRange}행`;
  return "대상 요소 정보 없음";
}

function getDisplayPath(path: string | undefined) {
  if (!path) return "";
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).at(-1) ?? normalized;
}

function formatLineRange(issue: AccessibilityIssue) {
  if (issue.startLine && issue.endLine && issue.startLine !== issue.endLine) {
    return `${issue.startLine}-${issue.endLine}`;
  }

  return String(issue.startLine || issue.endLine || "");
}

function summarizeCodeBlock(codeBlock: string) {
  const firstLine = codeBlock
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "코드 조각 없음";

  const srcMatch = firstLine.match(/\bsrc=["']([^"']+)["']/i);
  const altMatch = firstLine.match(/\balt=["']([^"']*)["']/i);
  const tagMatch = firstLine.match(/^<([a-z0-9-]+)/i);
  const targetParts = [
    tagMatch ? `<${tagMatch[1]}>` : null,
    srcMatch ? `src="${getDisplayPath(srcMatch[1]) || srcMatch[1]}"` : null,
    altMatch ? `alt="${altMatch[1] || "비어 있음"}"` : null,
  ].filter(Boolean);

  if (targetParts.length > 0) return targetParts.join(" ");
  return firstLine.replace(/\s+/g, " ").slice(0, 80);
}
