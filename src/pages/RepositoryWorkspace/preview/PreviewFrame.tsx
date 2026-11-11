import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import type { AccessibilityIssue, LoadedFile } from "../types";
import { buildPreviewIssueHighlights } from "./issueHighlight";
import PreviewIssueOverlays from "./PreviewIssueOverlays";
import type { PreviewIssueOverlayBox } from "./PreviewIssueOverlays";

interface PreviewFrameProps {
  previewSrc: string;
  previewRevision: number;
  placeholderMessage: string;
  isLoading: boolean;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  issueHighlights?: AccessibilityIssue[];
  selectedIssueId?: string | null;
  filesByPath?: Record<string, LoadedFile>;
  /** 주소창에서 이동할 때마다 증가시켜 iframe 을 확실히 다시 로드한다. */
  navigationKey?: number;
  /** iframe 내부 라우팅으로 경로가 바뀌었을 때 (pathname + search + hash) */
  onLocationChange?: (path: string) => void;
  /** 프리뷰가 없는 페이지(404)를 열었을 때 */
  onNotFound?: () => void;
}

export default function PreviewFrame({
  previewSrc,
  previewRevision,
  placeholderMessage,
  iframeRef,
  issueHighlights = [],
  selectedIssueId,
  filesByPath = {},
  navigationKey = 0,
  onLocationChange,
  onNotFound,
}: PreviewFrameProps) {
  const internalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [overlayBoxes, setOverlayBoxes] = useState<PreviewIssueOverlayBox[]>([]);
  const highlights = useMemo(() => {
    const scoped = selectedIssueId
      ? issueHighlights.filter((issue) => issue.id === selectedIssueId)
      : issueHighlights;
    return buildPreviewIssueHighlights(scoped, filesByPath, selectedIssueId);
  }, [filesByPath, issueHighlights, selectedIssueId]);

  const setIframeRef = useCallback(
    (node: HTMLIFrameElement | null) => {
      internalIframeRef.current = node;
      if (iframeRef) {
        iframeRef.current = node;
      }
    },
    [iframeRef],
  );

  const postIssueHighlights = useCallback(() => {
    internalIframeRef.current?.contentWindow?.postMessage(
      {
        source: "codee-design-panel",
        type: "highlight-issues",
        payload: { issues: highlights },
      },
      "*",
    );
  }, [highlights]);

  useEffect(() => {
    if (highlights.length === 0) {
      setOverlayBoxes([]);
    }
    postIssueHighlights();
  }, [highlights, postIssueHighlights, previewSrc, previewRevision]);

  useEffect(() => {
    const isFromPreview = (event: MessageEvent) =>
      event.source === internalIframeRef.current?.contentWindow;

    const handleRuntimeMessage = (event: MessageEvent) => {
      if (!isFromPreview(event) || !event.data || event.data.source !== "codee-design-runtime") {
        return;
      }
      if (event.data.type === "ready") {
        postIssueHighlights();
        return;
      }
      if (event.data.type === "not-found") {
        onNotFound?.();
        return;
      }
      if (event.data.type === "location-changed") {
        const path = event.data.payload?.path;
        if (typeof path === "string") onLocationChange?.(path);
        return;
      }
      if (event.data.type === "issue-overlays") {
        const overlays = event.data.payload?.overlays;
        setOverlayBoxes(Array.isArray(overlays) ? overlays : []);
      }
    };

    window.addEventListener("message", handleRuntimeMessage);
    return () => window.removeEventListener("message", handleRuntimeMessage);
  }, [onLocationChange, onNotFound, postIssueHighlights]);

  if (!previewSrc) {
    return (
      <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center gap-2.5 bg-[#f8f8fb] text-center">
          <div className="h-[30px] w-[30px] rounded-full border-[3px] border-point-200 border-t-point [animation:spin_0.8s_linear_infinite]" />
        <strong className="text-base font-bold text-[#202124]">프로젝트를 실행하고 있습니다.</strong>
        <p className="m-0 max-w-md text-[13px] text-[#8b8d98]">{placeholderMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={setIframeRef}
        key={`${previewRevision}-${navigationKey}`}
        title="repository-preview"
        src={previewSrc}
        className="h-full w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        onError={() => onNotFound?.()}
        onLoad={() => {
          postIssueHighlights();
          window.setTimeout(postIssueHighlights, 300);
          window.setTimeout(postIssueHighlights, 1000);
        }}
      />
      <PreviewIssueOverlays overlays={overlayBoxes} />
    </div>
  );
}
