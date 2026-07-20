import { CAPTURE_HOST_PATH } from "./constants";

interface BuildCaptureHostUrlOptions {
  parentOrigin?: string;
  targetPath?: string;
  waitMs?: number;
}

export function buildCaptureHostUrl(
  previewUrl: string,
  options: BuildCaptureHostUrlOptions = {},
): string {
  const base = previewUrl.endsWith("/") ? previewUrl : `${previewUrl}/`;
  const params = new URLSearchParams({
    parentOrigin: options.parentOrigin ?? window.location.origin,
    target: options.targetPath ?? "/",
    waitMs: String(options.waitMs ?? 1500),
  });

  return `${base}${CAPTURE_HOST_PATH}?${params.toString()}`;
}
