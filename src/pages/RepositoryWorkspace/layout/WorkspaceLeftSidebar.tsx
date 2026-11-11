import type {
  AccessibilityCategoryGroup,
  AccessibilityScoreSummary,
  AccessibilityIssue,
} from "../types";
import SelectedIssuePanel from "../overview/SelectedIssuePanel";
import { WorkspaceReauditButton } from "./buttons";
import AccessibilityDetailSection from "./leftSidebar/AccessibilityDetailSection";
import AccessibilityScoreCard from "./leftSidebar/AccessibilityScoreCard";
import WorkspaceSidebar from "./WorkspaceSidebar";
import type { AiCodeFixController } from "../analysis/useAiCodeFix";

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
  detailIssue?: AccessibilityIssue | null;
  aiFix?: AiCodeFixController;
  onBackFromIssue?: () => void;
  onEditInCode?: () => void;
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
  detailIssue,
  onBackFromIssue,
  onEditInCode,
  aiFix,
}: WorkspaceLeftSidebarProps) {
  const statusMessage = error
    ? error
    : !isSupported
      ? "프리뷰가 준비되면 전체 저장소를 재검사할 수 있습니다."
      : isAnalyzing
        ? "전체 저장소 웹 접근성 재검사 중..."
        : analyzedPath
          ? groups.length === 0
            ? `${analyzedPath}에서 발견된 위반 항목이 없습니다.`
            : `검사 대상: ${analyzedPath}`
          : "재검사 버튼으로 전체 저장소 웹 접근성을 검사할 수 있습니다.";

  const reauditDisabledReason = isAnalyzing
    ? undefined
    : !isSupported
      ? "프리뷰가 준비될 때까지 기다려 주세요."
      : !hasPendingEdits
        ? "마지막 검사 이후 코드가 수정되면 재검사가 활성화됩니다."
        : undefined;

  return (
    <WorkspaceSidebar side="right" label="접근성 검사 사이드바">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className="flex min-h-0 flex-1 flex-col"
          inert={Boolean(detailIssue && onBackFromIssue)}
        >
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
        </div>
        {detailIssue && onBackFromIssue ? (
          <div className="absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col bg-point-50">
            <SelectedIssuePanel
              key={detailIssue.id}
              issue={detailIssue}
              aiFix={aiFix}
              onClose={onBackFromIssue}
              onBack={onBackFromIssue}
              onEditInCode={onEditInCode}
            />
          </div>
        ) : null}
      </div>
    </WorkspaceSidebar>
  );
}
