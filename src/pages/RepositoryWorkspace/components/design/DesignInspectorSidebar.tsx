import type { SelectedPreviewElement, VisualDesignValues } from "../../types";
import DesignControlPanel from "../DesignControlPanel";

interface DesignInspectorSidebarProps {
  selectedElement: SelectedPreviewElement | null;
  values: VisualDesignValues;
  onChange: (patch: Partial<VisualDesignValues>) => void;
}

export default function DesignInspectorSidebar({
  selectedElement,
  values,
  onChange,
}: DesignInspectorSidebarProps) {
  return (
    <aside className="min-h-0 min-w-0 overflow-y-auto border-l border-slate-200 bg-white" aria-label="디자인 도구 사이드바">
      <DesignControlPanel selectedElement={selectedElement} values={values} onChange={onChange} />
    </aside>
  );
}
