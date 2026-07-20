import { buildCaptureHostUrl } from "./buildCaptureHostUrl";
import {
  CAPTURE_MESSAGE,
  CAPTURE_TIMEOUT_MS,
  CAPTURE_VIEWPORT,
  CAPTURE_WAIT_MS,
} from "./constants";
import type { CapturedPreviewSnapshot, CapturePreviewSnapshotOptions } from "./types";

interface CaptureHostMessage {
  type?: string;
  requestId?: string | null;
  ok?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  base64?: string;
  code?: string;
  message?: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function buildDirectCaptureUrl(previewUrl: string, waitMs: number): string {
  const url = new URL(previewUrl);
  url.searchParams.set("__cursor_capture", "1");
  url.searchParams.set("parentOrigin", window.location.origin);
  url.searchParams.set("waitMs", String(waitMs));
  return url.toString();
}

export function capturePreviewSnapshot(
  options: CapturePreviewSnapshotOptions,
): Promise<CapturedPreviewSnapshot> {
  const previewOrigin = new URL(options.previewUrl).origin;
  const waitMs = options.waitMs ?? CAPTURE_WAIT_MS;
  const mode = options.mode ?? "host";
  const captureUrl =
    mode === "direct"
      ? buildDirectCaptureUrl(options.previewUrl, waitMs)
      : buildCaptureHostUrl(options.previewUrl, {
          targetPath: options.targetPath,
          waitMs,
        });
  const requestId = crypto.randomUUID();
  const timeoutMs = options.timeoutMs ?? CAPTURE_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.title = "preview-capture";
    iframe.style.cssText = [
      "position:fixed",
      "left:-10000px",
      "top:0",
      `width:${CAPTURE_VIEWPORT.width}px`,
      `height:${CAPTURE_VIEWPORT.height}px`,
      "opacity:0",
      "pointer-events:none",
      "border:0",
    ].join(";");
    iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-modals allow-popups";

    let settled = false;
    let attempts = 0;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      iframe.remove();
      window.clearTimeout(timeoutId);
      window.clearInterval(retryId);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (snapshot: CapturedPreviewSnapshot) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(snapshot);
    };

    const sendCaptureRequest = () => {
      if (settled || attempts >= 6) return;
      attempts += 1;
      iframe.contentWindow?.postMessage(
        {
          type: CAPTURE_MESSAGE.REQUEST,
          requestId,
          targetPath: options.targetPath ?? "/",
          viewport: CAPTURE_VIEWPORT,
          waitMs,
        },
        previewOrigin,
      );
    };

    const onMessage = (event: MessageEvent<CaptureHostMessage>) => {
      if (event.origin !== previewOrigin) return;

      const data = event.data;
      if (!data?.type) return;

      if (data.type === CAPTURE_MESSAGE.READY) {
        sendCaptureRequest();
        return;
      }

      if (data.requestId !== requestId) return;

      if (data.type === CAPTURE_MESSAGE.RESULT && data.ok && data.base64) {
        succeed({
          blob: base64ToBlob(data.base64, data.mimeType ?? "image/png"),
          width: data.width ?? CAPTURE_VIEWPORT.width,
          height: data.height ?? CAPTURE_VIEWPORT.height,
        });
        return;
      }

      if (data.type === CAPTURE_MESSAGE.ERROR) {
        fail(new Error(data.message ?? `Capture failed (${data.code ?? "UNKNOWN"})`));
      }
    };

    const timeoutId = window.setTimeout(() => {
      fail(new Error(`프리뷰 스냅샷 캡처 시간이 초과되었습니다. (${timeoutMs / 1000}초)`));
    }, timeoutMs);

    const retryId = window.setInterval(() => {
      if (!settled) sendCaptureRequest();
    }, 2500);

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
    iframe.addEventListener("load", () => {
      window.setTimeout(() => {
        if (!settled) sendCaptureRequest();
      }, 500);
    });
    iframe.src = captureUrl;
  });
}
