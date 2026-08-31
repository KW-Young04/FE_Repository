import type { VisualDesignValues } from "./types";

/**
 * 디자인 패널의 값 변경(patch)을 실제 CSS 선언으로 변환한다.
 * 이 결과 하나로 (1) 프리뷰 iframe에 실시간 적용, (2) 소스 코드에 인라인 style 기록을
 * 모두 처리하므로 프리뷰와 코드가 항상 동일하게 유지된다.
 */

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function px(value: number): string {
  return `${Math.round(Number.isFinite(value) ? value : 0)}px`;
}

function normalizeHex(hex: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex || "") ? hex.toLowerCase() : fallback;
}

function toColor(hex: string, alphaPercent: number, fallback: string): string {
  const normalized = normalizeHex(hex, fallback);
  const alpha = clampPercent(alphaPercent) / 100;
  if (alpha >= 1) return normalized;
  const value = parseInt(normalized.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
}

function transformValue(values: VisualDesignValues): string {
  const parts: string[] = [];
  // translate 를 맨 앞에 둔다 → matrix 의 e,f 로 그대로 읽혀 재선택 시 이동량 복원이 정확하다.
  const x = Number.isFinite(values.x) ? Math.round(values.x) : 0;
  const y = Number.isFinite(values.y) ? Math.round(values.y) : 0;
  if (x !== 0 || y !== 0) {
    parts.push(`translate(${x}px, ${y}px)`);
  }
  if (Number.isFinite(values.rotation) && values.rotation !== 0) {
    parts.push(`rotate(${Math.round(values.rotation)}deg)`);
  }
  if (values.flipH) parts.push("scaleX(-1)");
  if (values.flipV) parts.push("scaleY(-1)");
  return parts.length ? parts.join(" ") : "none";
}

function effectDeclarations(values: VisualDesignValues): Record<string, string> {
  const alpha = clampPercent(values.effectOpacity) / 100;
  if (!values.dropShadow || alpha === 0) {
    return { "box-shadow": "none", filter: "none" };
  }
  if (values.effectType === "inner-shadow") {
    return {
      "box-shadow": `inset 0 8px 22px rgba(15, 23, 42, ${Number((0.28 * alpha).toFixed(3))})`,
      filter: "none",
    };
  }
  if (values.effectType === "layer-blur") {
    return { "box-shadow": "none", filter: `blur(${Math.round(8 * alpha)}px)` };
  }
  return {
    "box-shadow": `0 16px 34px rgba(15, 23, 42, ${Number((0.28 * alpha).toFixed(3))})`,
    filter: "none",
  };
}

/**
 * @param next 병합된 다음 상태(전체 값)
 * @param changedKeys 이번에 바뀐 필드 목록 — 이 필드에 영향받는 CSS만 출력하여
 *   사용자가 건드리지 않은 속성이 인라인 style에 끼어들어 레이아웃을 깨는 일을 막는다.
 */
export function designPatchToCss(
  next: VisualDesignValues,
  changedKeys: readonly string[],
): Record<string, string> {
  const changed = new Set(changedKeys);
  const touched = (...keys: (keyof VisualDesignValues)[]) => keys.some((key) => changed.has(key));
  const css: Record<string, string> = {};

  if (touched("alignment")) {
    css["text-align"] = next.alignment;
  }
  // X/Y 이동은 transform: translate 로 처리한다(요소 크기·주변 레이아웃을 건드리지 않음).
  // rotation/flip 과 하나의 transform 으로 합성된다.
  if (touched("x", "y", "rotation", "flipH", "flipV")) {
    css.transform = transformValue(next);
  }
  if (touched("width")) {
    css.width = px(Math.max(0, next.width));
  }
  if (touched("height")) {
    css.height = px(Math.max(0, next.height));
  }
  if (touched("opacity")) {
    css.opacity = String(clampPercent(next.opacity) / 100);
  }
  if (touched("borderRadius")) {
    css["border-radius"] = px(Math.max(0, next.borderRadius));
  }
  if (touched("textColor", "textColorOpacity")) {
    css.color = toColor(next.textColor, next.textColorOpacity, "#000000");
  }
  if (touched("backgroundColor", "fillOpacity")) {
    css["background-color"] = toColor(next.backgroundColor, next.fillOpacity, "#ffffff");
  }
  if (touched("borderColor", "strokeOpacity", "borderWidth")) {
    const width = Math.max(0, next.borderWidth);
    css["border-style"] = width > 0 ? "solid" : "none";
    css["border-width"] = px(width);
    css["border-color"] = toColor(next.borderColor, next.strokeOpacity, "#000000");
  }
  if (touched("dropShadow", "effectType", "effectOpacity")) {
    Object.assign(css, effectDeclarations(next));
  }

  return css;
}
