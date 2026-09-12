import type { AccessibilityCategoryGroup, AccessibilityScoreSummary } from "../types";
import { WorkspaceReauditButton } from "./buttons";
import AccessibilityDetailSection from "./leftSidebar/AccessibilityDetailSection";
import AccessibilityScoreCard from "./leftSidebar/AccessibilityScoreCard";
import WorkspaceSidebar from "./WorkspaceSidebar";

interface WorkspaceLeftSidebarProps {
  score: AccessibilityScoreSummary;
  groups: AccessibilityCategoryGroup[];
  selectedIssueId: string | null;
  isAnalyzing: boolean;
  isSupported: boolean;
  analyzedPath: string | null;
  hasPendingEdits: boolean;
  canReaudit: boolean;
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
  hasPendingEdits,
  canReaudit,
  error,
  onSelectIssue,
  onReaudit,
}: WorkspaceLeftSidebarProps) {
  const statusMessage = error
    ? error
    : !isSupported
      ? "HTML/JSX 계열 파일을 열면 재검사할 수 있습니다."
      : isAnalyzing
        ? "웹 접근성 검사 중..."
        : analyzedPath
          ? groups.length === 0
            ? `${analyzedPath} 에서 발견된 위반 항목이 없습니다.`
            : `검사 대상: ${analyzedPath}`
          : "재검사 버튼으로 웹 접근성을 검사할 수 있습니다.";

  const reauditDisabledReason = isAnalyzing
    ? undefined
    : !isSupported
      ? "분석 가능한 파일을 열어 주세요."
      : !hasPendingEdits
        ? "마지막 검사 이후 코드가 수정되면 재검사가 활성화됩니다."
        : undefined;

  return (
    <WorkspaceSidebar side="left" label="접근성 검사 사이드바">
      <AccessibilityScoreCard score={score} />

      {statusMessage && (
        <p
          className={`truncate px-2.5 pb-2 text-[11px] font-medium ${
            error ? "text-rose-500" : "text-slate-400"
          }`}
          title={statusMessage}
        >
          {statusMessage}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <AccessibilityDetailSection
          groups={groups}
          selectedIssueId={selectedIssueId}
          onSelectIssue={onSelectIssue}
        />
      </div>

      <div className="mx-2.5 mb-2.5 mt-5 shrink-0">
        <WorkspaceReauditButton
          onClick={onReaudit}
          disabled={!canReaudit}
          title={reauditDisabledReason}
        >
          {isAnalyzing ? "검사 중..." : undefined}
        </WorkspaceReauditButton>
      </div>
    </WorkspaceSidebar>
  );
}
