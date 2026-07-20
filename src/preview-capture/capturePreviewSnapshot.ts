import { buildCaptureHostUrl } from "./buildCaptureHostUrl";
import {
  CAPTURE_MESSAGE,
  CAPTURE_TIMEOUT_MS,
  CAPTURE_VIEWPORT,
  CAPTURE_WAIT_MS,
} from "./constants";
import { snapshotError, snapshotLog, snapshotWarn } from "./snapshotLogger";
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

export function capturePreviewSnapshot(
  options: CapturePreviewSnapshotOptions,
): Promise<CapturedPreviewSnapshot> {
  const previewOrigin = new URL(options.previewUrl).origin;
  const waitMs = options.waitMs ?? CAPTURE_WAIT_MS;
  const mode = options.mode ?? "host";
  const captureUrl =
    mode === "direct"
      ? options.previewUrl
      : buildCaptureHostUrl(options.previewUrl, {
          targetPath: options.targetPath,
          waitMs,
        });
  const requestId = crypto.randomUUID();
  const timeoutMs = options.timeoutMs ?? CAPTURE_TIMEOUT_MS;
  const startedAt = Date.now();

  snapshotLog("캡처 클라이언트 시작", {
    mode,
    previewUrl: options.previewUrl,
    captureUrl,
    previewOrigin,
    waitMs,
    timeoutMs,
    requestId,
  });

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
      snapshotError("캡처 실패", {
        message: error.message,
        attempts,
        elapsedMs: Date.now() - startedAt,
      });
      cleanup();
      reject(error);
    };

    const succeed = (snapshot: CapturedPreviewSnapshot) => {
      if (settled) return;
      settled = true;
      snapshotLog("캡처 성공", {
        width: snapshot.width,
        height: snapshot.height,
        blobSize: snapshot.blob.size,
        attempts,
        elapsedMs: Date.now() - startedAt,
      });
      cleanup();
      resolve(snapshot);
    };

    const sendCaptureRequest = () => {
      if (settled || attempts >= 8) return;
      attempts += 1;
      snapshotLog("CAPTURE_REQUEST 전송", { attempt: attempts, requestId, previewOrigin });
      iframe.contentWindow?.postMessage(
        {
          type: CAPTURE_MESSAGE.REQUEST,
          requestId,
          targetPath: options.targetPath ?? "/",
          viewport: CAPTURE_VIEWPORT,
          waitMs,
          parentOrigin: window.location.origin,
        },
        previewOrigin,
      );
    };

    const onMessage = (event: MessageEvent<CaptureHostMessage>) => {
      if (event.origin !== previewOrigin) return;

      const data = event.data;
      if (!data?.type) return;

      if (data.type === CAPTURE_MESSAGE.READY) {
        snapshotLog("CAPTURE_READY 수신", { origin: event.origin, elapsedMs: Date.now() - startedAt });
        sendCaptureRequest();
        return;
      }

      if (data.requestId !== requestId) return;

      if (data.type === CAPTURE_MESSAGE.RESULT && data.ok && data.base64) {
        snapshotLog("CAPTURE_RESULT 수신", {
          width: data.width,
          height: data.height,
          base64Length: data.base64.length,
        });
        succeed({
          blob: base64ToBlob(data.base64, data.mimeType ?? "image/png"),
          width: data.width ?? CAPTURE_VIEWPORT.width,
          height: data.height ?? CAPTURE_VIEWPORT.height,
        });
        return;
      }

      if (data.type === CAPTURE_MESSAGE.ERROR) {
        snapshotWarn("CAPTURE_ERROR 수신", data);
        fail(new Error(data.message ?? `Capture failed (${data.code ?? "UNKNOWN"})`));
      }
    };

    const timeoutId = window.setTimeout(() => {
      fail(new Error(`프리뷰 스냅샷 캡처 시간이 초과되었습니다. (${timeoutMs / 1000}초)`));
    }, timeoutMs);

    const retryId = window.setInterval(() => {
      if (!settled) {
        snapshotLog("CAPTURE_REQUEST 재시도 타이머", { attempts, elapsedMs: Date.now() - startedAt });
        sendCaptureRequest();
      }
    }, 2000);

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
    iframe.addEventListener("load", () => {
      snapshotLog("캡처 iframe load 이벤트", { captureUrl, elapsedMs: Date.now() - startedAt });
      window.setTimeout(() => {
        if (!settled) sendCaptureRequest();
      }, 400);
    });
    iframe.addEventListener("error", () => {
      snapshotWarn("캡처 iframe error 이벤트", { captureUrl });
    });
    iframe.src = captureUrl;
    snapshotLog("캡처 iframe src 설정 완료", { captureUrl });
  });
}
