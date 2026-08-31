import { useEffect, useRef, useState } from "react";

import { designPatchToCss } from "../designCss";
import type { SelectedPreviewElement, VisualDesignValues } from "../types";

export const DEFAULT_DESIGN_VALUES: VisualDesignValues = {
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
  return (
    message.source === "codee-design-runtime" &&
    message.type === "selected" &&
    Boolean(message.payload)
  );
}

interface UseDesignInspectorOptions {
  /** 프리뷰가 교체되면 선택 상태를 초기화하기 위한 키 */
  previewSrc: string;
  onDesignPatch: (sourceId: number | null, css: Record<string, string>) => void;
}

export function useDesignInspector({ previewSrc, onDesignPatch }: UseDesignInspectorOptions) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedPreviewElement | null>(null);
  const [designValues, setDesignValues] = useState<VisualDesignValues>(DEFAULT_DESIGN_VALUES);
  const [inspectedSrc, setInspectedSrc] = useState(previewSrc);

  // 프리뷰가 교체되면 이전 선택은 더 이상 유효하지 않다.
  if (previewSrc !== inspectedSrc) {
    setInspectedSrc(previewSrc);
    setSelectedElement(null);
    setDesignValues(DEFAULT_DESIGN_VALUES);
  }

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

  const handleDesignChange = (patch: Partial<VisualDesignValues>) => {
    const next = { ...designValues, ...patch };
    setDesignValues(next);

    const css = designPatchToCss(next, Object.keys(patch));
    if (Object.keys(css).length === 0) return;

    iframeRef.current?.contentWindow?.postMessage(
      { source: "codee-design-panel", type: "apply-css", payload: { css } },
      "*",
    );

    if (selectedElement) {
      onDesignPatch(selectedElement.sourceId, css);
    }
  };

  return { iframeRef, selectedElement, designValues, handleDesignChange };
}
