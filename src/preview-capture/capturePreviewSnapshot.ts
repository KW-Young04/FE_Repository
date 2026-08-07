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
  stage?: string;
  detail?: unknown;
  href?: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function isWebContainerOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return (
      host.endsWith(".webcontainer-api.io") ||
      host.endsWith(".webcontainer.io") ||
      host.endsWith(".local-corp.webcontainer-api.io")
    );
  } catch {
    return false;
  }
}

function isAllowedMessageOrigin(eventOrigin: string, expectedOrigin: string): boolean {
  if (eventOrigin === expectedOrigin) return true;
  // WebContainer preview URLs can remap hostnames between server-ready and iframe load.
  if (isWebContainerOrigin(eventOrigin) && isWebContainerOrigin(expectedOrigin)) return true;
  return false;
}

export function capturePreviewSnapshot(
  options: CapturePreviewSnapshotOptions,
): Promise<CapturedPreviewSnapshot> {
  let previewOrigin = new URL(options.previewUrl).origin;
  const waitMs = options.waitMs ?? CAPTURE_WAIT_MS;
  const mode = options.mode ?? "direct";
  const captureUrl =
    mode === "direct"
      ? (() => {
          // WebContainer often rejects navigations with query strings; keep URL clean.
          const url = new URL(options.previewUrl);
          url.search = "";
          url.hash = "";
          return url.toString();
        })()
      : buildCaptureHostUrl(options.previewUrl, {
          targetPath: options.targetPath,
          waitMs,
          strategy: options.hostStrategy ?? "file",
        });
  const requestId = crypto.randomUUID();
  const timeoutMs = options.timeoutMs ?? CAPTURE_TIMEOUT_MS;
  const startedAt = Date.now();
  const maxAttempts = mode === "direct" ? 24 : 12;

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
      "left:0",
      "top:0",
      `width:${CAPTURE_VIEWPORT.width}px`,
      `height:${CAPTURE_VIEWPORT.height}px`,
      "opacity:0.01",
      "pointer-events:none",
      "border:0",
      "z-index:-1",
    ].join(";");
    iframe.sandbox =
      "allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox";

    let settled = false;
    let attempts = 0;
    let sawReady = false;
    let lastStatus: string | null = null;

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
        sawReady,
        lastStatus,
        mode,
        captureUrl,
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
      if (settled || attempts >= maxAttempts) return;
      const win = iframe.contentWindow;
      if (!win) {
        snapshotWarn("CAPTURE_REQUEST 스킵 — contentWindow 없음", { attempts });
        return;
      }
      attempts += 1;
      snapshotLog("CAPTURE_REQUEST 전송", { attempt: attempts, requestId, previewOrigin, sawReady });
      try {
        win.postMessage(
          {
            type: CAPTURE_MESSAGE.REQUEST,
            requestId,
            targetPath: options.targetPath ?? "/",
            viewport: CAPTURE_VIEWPORT,
            waitMs,
            parentOrigin: window.location.origin,
          },
          "*",
        );
      } catch (error) {
        snapshotWarn("CAPTURE_REQUEST postMessage 실패", error);
      }
    };

    const onMessage = (event: MessageEvent<CaptureHostMessage>) => {
      const data = event.data;
      if (!data?.type || typeof data.type !== "string") return;
      if (!data.type.startsWith("CURSOR_PREVIEW_CAPTURE")) return;

      if (!isAllowedMessageOrigin(event.origin, previewOrigin)) {
        snapshotWarn("캡처 메시지 origin 불일치", {
          eventOrigin: event.origin,
          previewOrigin,
          type: data.type,
        });
        return;
      }

      // Learn the live iframe origin (may differ slightly from server-ready URL).
      previewOrigin = event.origin;

      if (data.type === "CURSOR_PREVIEW_CAPTURE_STATUS") {
        lastStatus = data.stage ?? null;
        snapshotLog("CAPTURE_STATUS", {
          stage: data.stage,
          detail: data.detail,
          href: data.href,
          elapsedMs: Date.now() - startedAt,
        });
        return;
      }

      if (data.type === CAPTURE_MESSAGE.READY) {
        const firstReady = !sawReady;
        sawReady = true;
        snapshotLog("CAPTURE_READY 수신", { origin: event.origin, elapsedMs: Date.now() - startedAt });
        if (firstReady) sendCaptureRequest();
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
      const hint = sawReady
        ? `READY는 왔지만 RESULT가 없습니다 (lastStatus=${lastStatus ?? "none"}). html2canvas/앱 마운트 실패 가능성이 큽니다.`
        : mode === "direct"
          ? `READY가 오지 않았습니다 (lastStatus=${lastStatus ?? "none"}). index.html 캡처 브리지 미주입이거나 프리뷰 JS 오류일 수 있습니다.`
          : `READY가 오지 않았습니다 (lastStatus=${lastStatus ?? "none"}). capture-host 미로드 또는 origin 불일치일 수 있습니다.`;
      fail(new Error(`프리뷰 스냅샷 캡처 시간이 초과되었습니다. (${timeoutMs / 1000}초) ${hint}`));
    }, timeoutMs);

    const retryId = window.setInterval(() => {
      if (!settled) {
        snapshotLog("CAPTURE_REQUEST 재시도 타이머", {
          attempts,
          sawReady,
          lastStatus,
          elapsedMs: Date.now() - startedAt,
        });
        sendCaptureRequest();
      }
    }, 2500);

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
