import { useEffect, useMemo, useRef, useState } from "react";
import type { PreviewStatus, SelectedPreviewElement, VisualDesignValues } from "../types";
import { designPatchToCss } from "../designCss";
import DesignControlPanel from "./DesignControlPanel";

interface PreviewPanelProps {
  previewStatus: PreviewStatus;
  previewUrl: string;
  previewRevision: number;
  previewProjectLabel: string;
  runtimeError: string | null;
  runtimeLog: string[];
  designWriteEnabled: boolean;
  onDesignPatch: (sourceId: number | null, css: Record<string, string>) => void;
}

const DEFAULT_DESIGN_VALUES: VisualDesignValues = {
  position: "static",
  alignment: "left",
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  opacity: 100,
  borderRadius: 0,
  textColor: "#000000",
  textColorOpacity: 100,
  backgroundColor: "#ffffff",
  fillOpacity: 100,
  borderColor: "#000000",
  strokeOpacity: 100,
  borderWidth: 0,
  dropShadow: false,
  effectType: "drop-shadow",
  effectOpacity: 100,
};

interface DesignRuntimeSelectedMessage {
  source: "codee-design-runtime";
  type: "selected";
  payload: SelectedPreviewElement & { values: VisualDesignValues };
}

function isDesignRuntimeSelectedMessage(value: unknown): value is DesignRuntimeSelectedMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<DesignRuntimeSelectedMessage>;
  return message.source === "codee-design-runtime" && message.type === "selected" && Boolean(message.payload);
}

export default function PreviewPanel({
  previewStatus,
  previewUrl,
  previewRevision,
  previewProjectLabel,
  runtimeError,
  runtimeLog,
  designWriteEnabled,
  onDesignPatch,
}: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedPreviewElement | null>(null);
  const [designValues, setDesignValues] = useState<VisualDesignValues>(DEFAULT_DESIGN_VALUES);

  const previewSrc = useMemo(
    () =>
      previewUrl && previewStatus === "ready"
        ? `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}_rev=${previewRevision}`
        : "",
    [previewRevision, previewStatus, previewUrl],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isDesignRuntimeSelectedMessage(event.data)) return;
      const { values, ...element } = event.data.payload;
      setSelectedElement(element);
      setDesignValues(values);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    setSelectedElement(null);
    setDesignValues(DEFAULT_DESIGN_VALUES);
  }, [previewSrc]);

  const handleDesignChange = (patch: Partial<VisualDesignValues>) => {
    const next = { ...designValues, ...patch };
    setDesignValues(next);

    const css = designPatchToCss(next, Object.keys(patch));
    if (Object.keys(css).length === 0) return;

    // (1) 프리뷰 iframe에 실시간 적용
    iframeRef.current?.contentWindow?.postMessage(
      { source: "codee-design-panel", type: "apply-css", payload: { css } },
      "*",
    );

    // (2) 소스 코드에 반영 (정적 HTML + data-codee-id 앵커가 있을 때)
    if (selectedElement) {
      onDesignPatch(selectedElement.sourceId, css);
    }
  };

  return (
    <div className="col-span-6 flex min-h-0 overflow-hidden border border-slate-200 bg-white">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2">
          <div className="min-w-0">
            <strong className="text-sm text-slate-800">실시간 프리뷰</strong>
            <p className="truncate text-[11px] font-medium text-slate-500">{previewProjectLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={[
                "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                designWriteEnabled
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-slate-50 text-slate-500",
              ].join(" ")}
              title={designWriteEnabled ? "디자인 변경이 소스 코드에 함께 반영됩니다." : "번들러 프로젝트는 프리뷰에만 반영됩니다."}
            >
              {designWriteEnabled ? "코드 반영 ON" : "프리뷰 전용"}
            </span>
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
              {previewStatus === "ready" ? "연결됨" : previewStatus === "loading" ? "준비 중" : previewStatus === "error" ? "오류" : "대기"}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100">
          {previewSrc ? (
            <iframe
              ref={iframeRef}
              key={previewRevision}
              title="repository-preview"
              src={previewSrc}
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

      <DesignControlPanel selectedElement={selectedElement} values={designValues} onChange={handleDesignChange} />
    </div>
  );
}