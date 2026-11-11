import { PREVIEW_PORT } from "@/workspace/constants";
import type { PreviewStatus } from "../types";

export function buildPreviewSrc(
  previewUrl: string,
  previewStatus: PreviewStatus,
  previewRevision: number,
  previewPath = "/",
): string {
  if (!previewUrl || previewStatus !== "ready") return "";
  let url: URL;
  try {
    url = new URL(previewPath, previewUrl);
  } catch {
    return "";
  }
  url.searchParams.set("_rev", String(previewRevision));
  return url.toString();
}

function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** WebContainer 주소(`--4173--`)나 URL.port 에서 표시용 포트를 고른다. */
export function getPreviewDisplayPort(previewUrl: string): number {
  try {
    const url = new URL(previewUrl);
    if (url.port) {
      const port = Number(url.port);
      if (Number.isFinite(port) && port > 0) return port;
    }
    const fromHost = url.hostname.match(/--(\d+)--/);
    if (fromHost) return Number(fromHost[1]);
  } catch {
    // 파싱 실패 시 기본 포트로 표시한다.
  }
  return PREVIEW_PORT;
}

/** 주소창에 보여줄 localhost 주소. iframe src 는 바꾸지 않는다. */
export function toDisplayPreviewUrl(previewUrl: string, path = "/"): string {
  const port = getPreviewDisplayPort(previewUrl);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `http://localhost:${port}${normalized}`;
}

/**
 * 주소창에 입력한 값을 앱 내부 경로(pathname + search + hash)로 변환한다.
 * - "/about", "about", "?tab=1", "#section" 같은 상대 경로는 previewUrl 기준으로 해석한다.
 * - localhost / 127.0.0.1 주소, previewUrl 과 origin 이 같은 전체 URL 도 허용한다.
 * - 외부 origin 이면 null 을 반환한다 (iframe 제한 및 디자인 런타임 주입 불가).
 */
export function resolvePreviewPath(previewUrl: string, input: string): string | null {
  const trimmed = input.trim();
  if (!previewUrl || !trimmed) return null;

  // "//evil.com" 같은 프로토콜 상대 URL 은 외부 이동이므로 아래 origin 비교에서 걸러진다.
  let base: URL;
  let target: URL;
  try {
    base = new URL(previewUrl);
    target = new URL(trimmed, base);
  } catch {
    return null;
  }

  if (target.origin !== base.origin && !isLocalhostHost(target.hostname)) return null;

  target.searchParams.delete("_rev");
  return `${target.pathname}${target.search}${target.hash}`;
}

export function isRootPreviewPath(path: string): boolean {
  if (!path || path === "/") return true;
  try {
    const url = new URL(path, "http://preview.local");
    url.searchParams.delete("_rev");
    return url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

/** 서버가 404/410을 주면 false. CORS 등으로 상태를 모르면 null. */
export async function previewPathExists(url: string): Promise<boolean | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
    });
    if (response.status === 404 || response.status === 410) return false;
    return true;
  } catch {
    return null;
  }
}
