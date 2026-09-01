import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";

import type { AccessibilityIssue } from "../../types";

interface PreviewIssueHighlight {
  id: string;
  code: string;
  selector: string;
}

interface PreviewFrameProps {
  previewSrc: string;
  previewRevision: number;
  placeholderMessage: string;
  isLoading: boolean;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  issueHighlights?: AccessibilityIssue[];
  selectedIssueId?: string | null;
}

function quoteCssAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function readHtmlAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? null;
}

function selectorFromCodeBlock(codeBlock: string | undefined): string | null {
  if (!codeBlock) return null;

  const tagMatch = codeBlock.trim().match(/^<([a-z][\w-]*)\b[^>]*>/i);
  if (!tagMatch) return null;

  const tag = tagMatch[1].toLowerCase();
  const fullTag = tagMatch[0];
  const id = readHtmlAttribute(fullTag, "id");
  if (id) return `[id="${quoteCssAttributeValue(id)}"]`;

  for (const attribute of ["aria-label", "alt", "href", "src", "name", "type"]) {
    const value = readHtmlAttribute(fullTag, attribute);
    if (value) return `${tag}[${attribute}="${quoteCssAttributeValue(value)}"]`;
  }

  const className = readHtmlAttribute(fullTag, "class");
  const firstClass = className?.split(/\s+/).find(Boolean);
  if (firstClass) return `${tag}[class~="${quoteCssAttributeValue(firstClass)}"]`;

  return tag;
}

export default function PreviewFrame({
  previewSrc,
  previewRevision,
  placeholderMessage,
  iframeRef,
  issueHighlights = [],
  selectedIssueId,
}: PreviewFrameProps) {
  const internalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const highlights = useMemo<PreviewIssueHighlight[]>(() => {
    const selectableIssues = selectedIssueId
      ? issueHighlights.filter((issue) => issue.id === selectedIssueId)
      : issueHighlights;

    return selectableIssues
      .filter((issue) => Boolean(issue.targetSelector))
      .map((issue) => ({
        id: issue.id,
        code: issue.code,
        selector: issue.targetSelector as string,
      }))
      .concat(
        selectableIssues
          .filter((issue) => !issue.targetSelector)
          .map((issue) => ({
            id: issue.id,
            code: issue.code,
            selector: selectorFromCodeBlock(issue.originalCodeBlock),
          }))
          .filter((issue): issue is PreviewIssueHighlight => Boolean(issue.selector)),
      );
  }, [issueHighlights, selectedIssueId]);

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
    postIssueHighlights();
  }, [postIssueHighlights, previewSrc, previewRevision]);

  useEffect(() => {
    const handleRuntimeReady = (event: MessageEvent) => {
      if (event.source !== internalIframeRef.current?.contentWindow) return;
      if (
        !event.data ||
        event.data.source !== "codee-design-runtime" ||
        event.data.type !== "ready"
      ) {
        return;
      }
      postIssueHighlights();
    };

    window.addEventListener("message", handleRuntimeReady);
    return () => window.removeEventListener("message", handleRuntimeReady);
  }, [postIssueHighlights]);

  if (!previewSrc) {
    return (
      <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center gap-2.5 bg-[#f8f8fb] text-center">
          <div className="h-[30px] w-[30px] rounded-full border-[3px] border-[#e2dcff] border-t-[#6d3df5] [animation:spin_0.8s_linear_infinite]" />
        <strong className="text-base font-bold text-[#202124]">프로젝트를 실행하고 있습니다.</strong>
        <p className="m-0 max-w-md text-[13px] text-[#8b8d98]">{placeholderMessage}</p>
      </div>
    );
  }

  return (
    <iframe
      ref={setIframeRef}
      key={previewRevision}
      title="repository-preview"
      src={previewSrc}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      onLoad={() => {
        postIssueHighlights();
        window.setTimeout(postIssueHighlights, 300);
        window.setTimeout(postIssueHighlights, 1000);
      }}
    />
  );
}
