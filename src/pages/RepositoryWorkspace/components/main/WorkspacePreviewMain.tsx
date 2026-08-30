import type { ReactNode, RefObject } from "react";

import type { PreviewStatus } from "../../types";
import { buildPreviewSrc } from "../../utils/previewSrc";
import PreviewFrame from "../preview/PreviewFrame";

interface WorkspacePreviewMainProps {
  repositoryUrl: string;
  previewStatus: PreviewStatus;
  previewUrl: string;
  previewRevision: number;
  previewProjectLabel: string;
  runtimeError: string | null;
  loadError: string | null;
  loadingMessage: string;
  /** Design 탭에서 프리뷰 iframe에 스타일 패치를 전달하기 위해 사용 */
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  /** 주소 표시줄 오른쪽에 덧붙일 배지 */
  trailingBadge?: ReactNode;
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
  iframeRef,
  trailingBadge,
}: WorkspacePreviewMainProps) {
  const previewSrc = buildPreviewSrc(previewUrl, previewStatus, previewRevision);
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

          {trailingBadge}

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
          <PreviewFrame
            previewSrc={previewSrc}
            previewRevision={previewRevision}
            placeholderMessage={placeholderMessage}
            isLoading={previewStatus === "loading"}
            iframeRef={iframeRef}
          />
        </div>
      </div>
    </section>
  );
}
