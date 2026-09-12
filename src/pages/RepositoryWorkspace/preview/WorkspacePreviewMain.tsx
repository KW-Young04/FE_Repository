import type { ReactNode, RefObject } from "react";

import type { AccessibilityIssue, LoadedFile, PreviewStatus } from "../types";
import { getTopIssues } from "../overview/issueVisual";
import BrowserToolbar from "./BrowserToolbar";
import PreviewFrame from "./PreviewFrame";
import { buildPreviewSrc } from "./previewSrc";
import TopIssuesSection from "../overview/TopIssuesSection";

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
  filesByPath?: Record<string, LoadedFile>;
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
  filesByPath = {},
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

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <BrowserToolbar
        displayUrl={displayUrl}
        showErrors={showErrors}
        onToggleErrors={() => onToggleErrors?.()}
        onRefresh={onRefresh}
      />

      <div
        className="relative min-h-0 w-full flex-1 overflow-hidden border-b border-[#e6e7ec] bg-white"
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
          filesByPath={filesByPath}
        />
      </div>

      <TopIssuesSection
        issues={topIssues}
        totalCount={issueHighlights.length}
        onSelectIssue={onSelectIssue}
      />
    </section>
  );
}
