export const CAPTURE_VIEWPORT = {
  width: 1280,
  height: 720,
} as const;

export const CAPTURE_WAIT_MS = 800;
export const CAPTURE_TIMEOUT_MS = 30_000;
export const CAPTURE_HOST_PATH = "__cursor__/capture-host.html";

export const CAPTURE_MESSAGE = {
  READY: "CURSOR_PREVIEW_CAPTURE_READY",
  REQUEST: "CURSOR_PREVIEW_CAPTURE_REQUEST",
  RESULT: "CURSOR_PREVIEW_CAPTURE_RESULT",
  ERROR: "CURSOR_PREVIEW_CAPTURE_ERROR",
} as const;
