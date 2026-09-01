import type { ReactNode, RefObject } from "react";

import type { AccessibilityIssue, PreviewStatus } from "../../types";
import { getTopIssues } from "../../utils/issueVisual";
import { buildPreviewSrc } from "../../utils/previewSrc";
import BrowserToolbar from "../preview/BrowserToolbar";
import PreviewFrame from "../preview/PreviewFrame";
import PreviewIssueOverlays from "../preview/PreviewIssueOverlays";
import TopIssuesSection from "./TopIssuesSection";

interface WorkspacePreviewMainProps {
  repositoryUrl: string;
  previewStatus: PreviewStatus;
  previewUrl: string;
  previewRevision: number;
  runtimeError: string | null;
  loadError: string | null;
  loadingMessage: string;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  issueHighlights?: AccessibilityIssue[];
  selectedIssueId?: string | null;
  isDesignTab?: boolean;
  showErrors?: boolean;
  onToggleErrors?: () => void;
  onRefresh?: () => void;
  onSelectIssue?: (issueId: string) => void;
  trailingBadge?: ReactNode;
}

function getDisplayUrl(repositoryUrl: string, previewUrl: string, previewStatus: PreviewStatus) {
  if (previewStatus === "ready" && previewUrl) return previewUrl;
  return repositoryUrl || "저장소 URL이 없습니다.";
}

function getPlaceholderMessage({
  previewStatus,
  previewUrl,
  runtimeError,
  loadError,
  loadingMessage,
}: Pick<
  WorkspacePreviewMainProps,
  "previewStatus" | "previewUrl" | "runtimeError" | "loadError" | "loadingMessage"
>) {
  if (previewStatus === "error") {
    return runtimeError ?? loadError ?? "프리뷰를 시작하지 못했습니다.";
  }

  if (loadError) return loadError;

  if (previewStatus === "loading" || !previewUrl) {
    return loadingMessage || "연결한 GitHub 저장소의 웹사이트를 준비하는 중입니다.";
  }

  return loadingMessage || "프리뷰를 준비하고 있습니다.";
}

export default function WorkspacePreviewMain({
  repositoryUrl,
  previewStatus,
  previewUrl,
  previewRevision,
  runtimeError,
  loadError,
  loadingMessage,
  iframeRef,
  issueHighlights = [],
  selectedIssueId,
  isDesignTab = false,
  showErrors = true,
  onToggleErrors,
  onRefresh,
  onSelectIssue,
}: WorkspacePreviewMainProps) {
  const previewSrc = buildPreviewSrc(previewUrl, previewStatus, previewRevision);
  const displayUrl = getDisplayUrl(repositoryUrl, previewUrl, previewStatus);
  const placeholderMessage = getPlaceholderMessage({
    previewStatus,
    previewUrl,
    runtimeError,
    loadError,
    loadingMessage,
  });
  const topIssues = getTopIssues(issueHighlights);
  const overlayIssues = selectedIssueId
    ? issueHighlights.filter((issue) => issue.id === selectedIssueId)
    : issueHighlights;

  return (
    <section
      className={[
        "flex min-w-0 flex-col bg-white",
        isDesignTab ? "min-h-full overflow-y-auto" : "h-full min-h-0 overflow-hidden",
      ].join(" ")}
    >
      <BrowserToolbar
        displayUrl={displayUrl}
        showErrors={showErrors}
        onToggleErrors={() => onToggleErrors?.()}
        onRefresh={onRefresh}
      />

      <div
        className={[
          "relative min-h-0 w-full overflow-hidden border-b border-[#e6e7ec] bg-white",
          isDesignTab ? "h-[620px] shrink-0" : "min-h-[420px] flex-1",
        ].join(" ")}
        aria-label={isDesignTab ? "디자인 편집 미리보기" : "연결된 GitHub 프로젝트 미리보기"}
      >
        <PreviewFrame
          previewSrc={previewSrc}
          previewRevision={previewRevision}
          placeholderMessage={placeholderMessage}
          isLoading={previewStatus === "loading"}
          iframeRef={iframeRef}
          issueHighlights={showErrors ? issueHighlights : []}
          selectedIssueId={selectedIssueId}
        />

        {isDesignTab && showErrors && <PreviewIssueOverlays issues={overlayIssues} />}
      </div>

      <TopIssuesSection
        issues={topIssues}
        totalCount={issueHighlights.length}
        onSelectIssue={onSelectIssue}
      />
    </section>
  );
}
