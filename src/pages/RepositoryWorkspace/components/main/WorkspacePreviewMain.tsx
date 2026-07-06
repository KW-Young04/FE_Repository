import type { PreviewStatus } from "@/pages/RepositoryWorkspaceTest/types";

interface WorkspacePreviewMainProps {
  repositoryUrl: string;
  previewStatus: PreviewStatus;
  previewUrl: string;
  previewRevision: number;
  previewProjectLabel: string;
  runtimeError: string | null;
  loadError: string | null;
  loadingMessage: string;
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 7H12.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7 1.5C5.5 3.5 4.8 5.2 4.8 7C4.8 8.8 5.5 10.5 7 12.5C8.5 10.5 9.2 8.8 9.2 7C9.2 5.2 8.5 3.5 7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function getDisplayUrl(repositoryUrl: string, previewUrl: string, previewStatus: PreviewStatus) {
  if (previewStatus === "ready" && previewUrl) return previewUrl;
  return repositoryUrl || "저장소 URL이 없습니다.";
}

function getStatusLabel(previewStatus: PreviewStatus) {
  if (previewStatus === "ready") return "연결됨";
  if (previewStatus === "loading") return "준비 중";
  if (previewStatus === "error") return "오류";
  return "대기";
}

function getPlaceholderMessage({
  previewStatus,
  runtimeError,
  loadError,
  loadingMessage,
}: Pick<
  WorkspacePreviewMainProps,
  "previewStatus" | "runtimeError" | "loadError" | "loadingMessage"
>) {
  if (previewStatus === "error") {
    return runtimeError ?? loadError ?? "프리뷰를 시작하지 못했습니다.";
  }

  if (loadError) return loadError;

  return loadingMessage || "프리뷰를 준비하고 있습니다.";
}

export default function WorkspacePreviewMain({
  repositoryUrl,
  previewStatus,
  previewUrl,
  previewRevision,
  previewProjectLabel,
  runtimeError,
  loadError,
  loadingMessage,
}: WorkspacePreviewMainProps) {
  const previewSrc =
    previewUrl && previewStatus === "ready"
      ? `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}_rev=${previewRevision}`
      : "";

  const displayUrl = getDisplayUrl(repositoryUrl, previewUrl, previewStatus);
  const placeholderMessage = getPlaceholderMessage({
    previewStatus,
    runtimeError,
    loadError,
    loadingMessage,
  });

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#ECECF3] p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-400">
              <GlobeIcon />
            </span>
            <p className="truncate text-sm font-medium text-slate-600">{displayUrl}</p>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-xs font-semibold text-slate-500">{previewProjectLabel}</p>
            <p
              className={[
                "text-xs font-bold",
                previewStatus === "ready"
                  ? "text-emerald-600"
                  : previewStatus === "error"
                    ? "text-rose-600"
                    : "text-slate-500",
              ].join(" ")}
            >
              {getStatusLabel(previewStatus)}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100">
          {previewSrc ? (
            <iframe
              key={previewRevision}
              title="repository-preview"
              src={previewSrc}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              {previewStatus === "loading" && (
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
              )}
              <p className="max-w-md text-sm font-medium leading-relaxed text-slate-500">
                {placeholderMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
