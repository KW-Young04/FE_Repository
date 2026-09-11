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
    <div className="min-h-0 flex-1 overflow-y-auto">
      <DesignControlPanel selectedElement={selectedElement} values={values} onChange={onChange} />
    </div>
  );
}
