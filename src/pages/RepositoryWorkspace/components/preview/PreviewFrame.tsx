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
  isLoading,
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
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        {isLoading && (
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
        )}
        <p className="max-w-md text-sm leading-relaxed font-medium text-slate-500">
          {placeholderMessage}
        </p>
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
