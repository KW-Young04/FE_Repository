import type { SelectedPreviewElement, VisualDesignValues } from "../types";
import DesignControlPanel from "./DesignControlPanel";

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
    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
      <DesignControlPanel selectedElement={selectedElement} values={values} onChange={onChange} />
    </div>
  );
}
