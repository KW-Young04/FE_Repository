import type { AccessibilityCategoryGroup, AccessibilityScoreSummary } from "../types";
import { WorkspaceReauditButton } from "./buttons";
import AccessibilityDetailSection from "./leftSidebar/AccessibilityDetailSection";
import AccessibilityScoreCard from "./leftSidebar/AccessibilityScoreCard";

interface WorkspaceLeftSidebarProps {
  score: AccessibilityScoreSummary;
  groups: AccessibilityCategoryGroup[];
  selectedIssueId: string | null;
  isAnalyzing: boolean;
  isSupported: boolean;
  analyzedPath: string | null;
  error: string | null;
  onSelectIssue: (issueId: string) => void;
  onReaudit: () => void;
}

export default function WorkspaceLeftSidebar({
  score,
  groups,
  selectedIssueId,
  isAnalyzing,
  isSupported,
  analyzedPath,
  error,
  onSelectIssue,
  onReaudit,
}: WorkspaceLeftSidebarProps) {
  const statusMessage = error
    ? error
    : !isSupported
      ? "HTML/JSX 계열 파일을 열면 실시간 검사가 시작됩니다."
      : isAnalyzing
        ? "웹 접근성 검사 중..."
        : analyzedPath
          ? groups.length === 0
            ? `${analyzedPath} 에서 발견된 위반 항목이 없습니다.`
            : `검사 대상: ${analyzedPath}`
          : null;

  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-[#F7F7FB] p-3"
      aria-label="접근성 검사 사이드바"
    >
      <AccessibilityScoreCard score={score} />

      {statusMessage && (
        <p
          className={`mt-2 truncate px-1 text-[11px] font-medium ${
            error ? "text-rose-500" : "text-slate-400"
          }`}
          title={statusMessage}
        >
          {statusMessage}
        </p>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <AccessibilityDetailSection
          groups={groups}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
        />
      </div>

      <div className="mt-3 shrink-0 pt-1">
        <WorkspaceReauditButton onClick={onReaudit} disabled={isAnalyzing || !isSupported}>
          {isAnalyzing ? "검사 중..." : undefined}
        </WorkspaceReauditButton>
      </div>
    </aside>
  );
}
