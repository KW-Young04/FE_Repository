import type { SelectedPreviewElement, VisualDesignValues } from "../../types";
import DesignControlPanel from "../DesignControlPanel";

interface DesignInspectorSidebarProps {
  selectedElement: SelectedPreviewElement | null;
  values: VisualDesignValues;
  designWriteEnabled: boolean;
  onChange: (patch: Partial<VisualDesignValues>) => void;
}

export default function DesignInspectorSidebar({
  selectedElement,
  values,
  designWriteEnabled,
  onChange,
}: DesignInspectorSidebarProps) {
  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white"
      aria-label="디자인 도구 사이드바"
    >
      <div className="shrink-0 border-b border-slate-200 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <strong className="text-sm font-bold text-slate-800">디자인 도구</strong>
          <span
            className={[
              "rounded-full border px-2 py-0.5 text-[10px] font-bold",
              designWriteEnabled
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-slate-50 text-slate-500",
            ].join(" ")}
            title={
              designWriteEnabled
                ? "변경한 스타일이 소스 코드에도 함께 반영됩니다."
                : "번들러 프로젝트는 프리뷰에만 반영되고 코드에는 기록되지 않습니다."
            }
          >
            {designWriteEnabled ? "코드 반영" : "프리뷰 전용"}
          </span>
        </div>
        {selectedElement && (
          <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
            {selectedElement.tagName.toLowerCase()}
            {selectedElement.idName ? `#${selectedElement.idName}` : ""}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DesignControlPanel selectedElement={selectedElement} values={values} onChange={onChange} />
      </div>
    </aside>
  );
}
