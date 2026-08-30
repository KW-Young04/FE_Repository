import type { RefObject } from "react";

interface PreviewFrameProps {
  previewSrc: string;
  previewRevision: number;
  placeholderMessage: string;
  isLoading: boolean;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
}

export default function PreviewFrame({
  previewSrc,
  previewRevision,
  placeholderMessage,
  isLoading,
  iframeRef,
}: PreviewFrameProps) {
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
      ref={iframeRef}
      key={previewRevision}
      title="repository-preview"
      src={previewSrc}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
    />
  );
}
