import type { PreviewStatus } from "../types";

export function buildPreviewSrc(
  previewUrl: string,
  previewStatus: PreviewStatus,
  previewRevision: number,
): string {
  if (!previewUrl || previewStatus !== "ready") return "";
  return `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}_rev=${previewRevision}`;
}
