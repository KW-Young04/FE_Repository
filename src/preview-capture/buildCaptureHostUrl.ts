import { CAPTURE_HOST_PATH } from "./constants";

export type CaptureHostUrlStrategy = "file" | "hash";

interface BuildCaptureHostUrlOptions {
  /** @deprecated Query params break WebContainer navigation; ignored. */
  parentOrigin?: string;
  targetPath?: string;
  waitMs?: number;
  /**
   * file: /__cursor__/capture-host.html (static servers)
   * hash: previewUrl#__cursor_capture_host (CRA/Vite — avoids SPA fallback)
   */
  strategy?: CaptureHostUrlStrategy;
}

/**
 * Build a capture-host URL without query strings.
 * WebContainer frequently throws on navigations like `?parentOrigin=...`.
 */
export function buildCaptureHostUrl(
  previewUrl: string,
  options: BuildCaptureHostUrlOptions = {},
): string {
  const strategy = options.strategy ?? "file";

  if (strategy === "hash") {
    const url = new URL(previewUrl);
    url.hash = "__cursor_capture_host";
    return url.toString();
  }

  const base = previewUrl.endsWith("/") ? previewUrl : `${previewUrl}/`;
  return `${base}${CAPTURE_HOST_PATH}`;
}
