import { useCallback, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import type { AccessibilityIssue, LoadedFile, PreviewStatus } from "../types";
import BrowserToolbar from "./BrowserToolbar";
import PreviewFrame from "./PreviewFrame";
import {
  buildPreviewSrc,
  isRootPreviewPath,
  previewPathExists,
  resolvePreviewPath,
  toDisplayPreviewUrl,
} from "./previewSrc";

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
  trailingBadge?: ReactNode;
}

function getDisplayUrl(
  repositoryUrl: string,
  previewUrl: string,
  previewStatus: PreviewStatus,
  currentPath: string,
) {
  if (previewStatus === "ready" && previewUrl) {
    return toDisplayPreviewUrl(previewUrl, currentPath);
  }
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
}: WorkspacePreviewMainProps) {
  // targetPath: iframe src 를 결정하는 이동 목표 / currentPath: iframe 내부 라우팅까지 반영한 실제 경로.
  // 내부 라우팅 결과를 src 에 되먹이면 iframe 이 불필요하게 다시 로드되므로 둘을 분리한다.
  const [targetPath, setTargetPath] = useState("/");
  const [currentPath, setCurrentPath] = useState("/");
  const [navigationKey, setNavigationKey] = useState(0);
  const [pathOwnerUrl, setPathOwnerUrl] = useState(previewUrl);
  const navigationTokenRef = useRef(0);
  const awaitingAddressNavRef = useRef(false);

  // 프리뷰 서버가 재시작되어 주소(origin)가 바뀌면 루트로 되돌린다.
  if (previewUrl !== pathOwnerUrl) {
    setPathOwnerUrl(previewUrl);
    setTargetPath("/");
    setCurrentPath("/");
    awaitingAddressNavRef.current = false;
  }

  const isPreviewReady = previewStatus === "ready" && Boolean(previewUrl);

  const goHome = useCallback((reload = true) => {
    navigationTokenRef.current += 1;
    awaitingAddressNavRef.current = false;
    setTargetPath("/");
    setCurrentPath("/");
    if (reload) {
      setNavigationKey((key) => key + 1);
    }
  }, []);

  const handleNotFound = useCallback(() => {
    // 주소창으로 이동한 뒤에만 404 → 홈으로 돌린다. 상시 감지하면 iframe 이 반복 재생성되어 입력이 막힌다.
    if (!awaitingAddressNavRef.current) return;
    if (isRootPreviewPath(targetPath) && isRootPreviewPath(currentPath)) {
      awaitingAddressNavRef.current = false;
      return;
    }
    goHome();
  }, [currentPath, goHome, targetPath]);

  const handleLocationChange = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const handleNavigate = (input: string): boolean => {
    const path = resolvePreviewPath(previewUrl, input);
    if (path === null || isRootPreviewPath(path)) {
      const alreadyHome = isRootPreviewPath(targetPath) && isRootPreviewPath(currentPath);
      goHome(!alreadyHome);
      return true;
    }

    const token = ++navigationTokenRef.current;
    awaitingAddressNavRef.current = true;
    setTargetPath(path);
    setCurrentPath(path);
    setNavigationKey((key) => key + 1);

    window.setTimeout(() => {
      if (token === navigationTokenRef.current) awaitingAddressNavRef.current = false;
    }, 1500);

    const probeUrl = buildPreviewSrc(previewUrl, previewStatus, previewRevision, path);
    void previewPathExists(probeUrl).then((exists) => {
      if (token !== navigationTokenRef.current) return;
      if (exists === false) goHome();
    });
    return true;
  };

  const previewSrc = buildPreviewSrc(previewUrl, previewStatus, previewRevision, targetPath);
  const displayUrl = getDisplayUrl(repositoryUrl, previewUrl, previewStatus, currentPath);
  const placeholderMessage = getPlaceholderMessage({
    previewStatus,
    previewUrl,
    runtimeError,
    loadError,
    loadingMessage,
  });

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <BrowserToolbar
        displayUrl={displayUrl}
        showErrors={showErrors}
        onToggleErrors={() => onToggleErrors?.()}
        onRefresh={onRefresh}
        canNavigate={isPreviewReady}
        onNavigate={handleNavigate}
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
          navigationKey={navigationKey}
          onLocationChange={handleLocationChange}
          onNotFound={handleNotFound}
        />
      </div>
    </section>
  );
}
