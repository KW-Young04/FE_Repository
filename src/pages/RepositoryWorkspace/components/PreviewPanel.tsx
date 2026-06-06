import type { PreviewStatus } from "../types";

interface PreviewPanelProps {
  previewStatus: PreviewStatus;
  previewUrl: string;
  runtimeError: string | null;
  runtimeLog: string[];
}

export default function PreviewPanel({ previewStatus, previewUrl, runtimeError, runtimeLog }: PreviewPanelProps) {
  return (
    <div className="col-span-4 flex min-h-0 flex-col overflow-hidden border border-slate-200 bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
        <strong className="text-sm text-slate-800">실시간 프리뷰</strong>
        <span
          className={[
            "text-xs font-bold",
            previewStatus === "ready"
              ? "text-green-600"
              : previewStatus === "error"
                ? "text-rose-600"
                : "text-slate-500",
          ].join(" ")}
        >
          {previewStatus === "ready"
            ? "연결됨"
            : previewStatus === "loading"
              ? "준비 중"
              : previewStatus === "error"
                ? "오류"
                : "대기"}
        </span>
      </div>

      <div className="min-h-0 flex-1 bg-slate-100">
        {previewUrl && previewStatus === "ready" ? (
          <iframe
            title="repository-preview"
            src={previewUrl}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-slate-500">
            {runtimeError ?? "프리뷰를 준비하고 있습니다."}
          </div>
        )}
      </div>

      <div className="h-28 shrink-0 overflow-auto border-t border-slate-200 bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-200">
        {runtimeLog.length === 0
          ? "로그가 없습니다."
          : runtimeLog.slice(-40).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
      </div>
    </div>
  );
}
