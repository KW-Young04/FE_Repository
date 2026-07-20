import type { WebContainer } from "@webcontainer/api";
import type { PreviewProjectProfile } from "@/pages/RepositoryWorkspace/previewProject";
import type { LoadedFile } from "@/pages/RepositoryWorkspace/types";
import { writeWorkspaceBinaryFile, writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { CAPTURE_HOST_HTML } from "./captureHostTemplate";
import { CAPTURE_PAGE_BRIDGE_SCRIPT } from "./capturePageBridgeScript";
import { snapshotLog, snapshotWarn } from "./snapshotLogger";

function resolveCaptureHostPath(profile: PreviewProjectProfile): string {
  if (profile.kind === "bundler") {
    const root = profile.workspaceRoot;
    return root
      ? `${root}/public/__cursor__/capture-host.html`
      : "public/__cursor__/capture-host.html";
  }

  return "__cursor__/capture-host.html";
}

function resolveHtml2CanvasPaths(profile: PreviewProjectProfile): string[] {
  if (profile.kind === "bundler") {
    const root = profile.workspaceRoot;
    const prefix = root ? `${root}/` : "";
    return [
      `${prefix}public/__cursor__/html2canvas.min.js`,
      `${prefix}public/html2canvas.min.js`,
    ];
  }
  return ["__cursor__/html2canvas.min.js", "html2canvas.min.js"];
}

function unique(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean)));
}

function resolveHtmlEntryCandidates(
  profile: PreviewProjectProfile,
  files: Record<string, LoadedFile>,
): string[] {
  const root = profile.workspaceRoot;
  const prefixed = (path: string) => (root ? `${root}/${path}` : path);

  const preferred = unique([
    prefixed("index.html"),
    prefixed("public/index.html"),
    "index.html",
    "public/index.html",
  ]);

  const existing = preferred.filter((path) => Boolean(files[path]));
  if (existing.length > 0) return existing;

  return Object.keys(files)
    .filter((path) => path.endsWith(".html") || path.endsWith(".htm"))
    .filter((path) => !path.includes("playground/"))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
    .slice(0, 3);
}

/**
 * CRA/Vite SPA fallback often serves index.html for /__cursor__/html2canvas.min.js,
 * so we inline the library before the capture bridge. No network fetch needed.
 */
function injectHtml2CanvasInline(html: string, source: string): string {
  if (html.includes('data-cursor-html2canvas="1"')) {
    return html;
  }

  const safe = source.replace(/<\/script/gi, "<\\/script");
  const snippet = `<script data-cursor-html2canvas="1">${safe}</script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${snippet}</body>`);
  }
  if (html.includes("</BODY>")) {
    return html.replace("</BODY>", `${snippet}</BODY>`);
  }
  return `${html}\n${snippet}`;
}

function injectBridgeIntoHtml(html: string, html2canvasSource: string): string {
  let next = injectHtml2CanvasInline(html, html2canvasSource);

  if (next.includes('data-cursor-capture="1"') || next.includes("__CURSOR_CAPTURE_BRIDGE__")) {
    return next;
  }

  const snippet = `<script data-cursor-capture="1">${CAPTURE_PAGE_BRIDGE_SCRIPT}</script>`;
  if (next.includes("</body>")) {
    return next.replace("</body>", `${snippet}</body>`);
  }
  if (next.includes("</BODY>")) {
    return next.replace("</BODY>", `${snippet}</BODY>`);
  }
  return `${next}\n${snippet}`;
}

async function readWorkspaceText(container: WebContainer, path: string): Promise<string | null> {
  try {
    return await container.fs.readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function loadHtml2CanvasSource(): Promise<{ bytes: Uint8Array; text: string }> {
  const base = import.meta.env.BASE_URL || "/";
  const url = new URL("vendor/html2canvas.min.js", window.location.origin + base).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`html2canvas vendor fetch failed (${response.status}) at ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("utf-8").decode(bytes);
  if (!text.includes("html2canvas")) {
    throw new Error(`html2canvas vendor content looks invalid at ${url}`);
  }
  return { bytes, text };
}

export async function injectCaptureAssets(
  container: WebContainer,
  profile: PreviewProjectProfile,
  files: Record<string, LoadedFile> = {},
): Promise<{ captureHostPath: string; patchedHtmlPaths: string[]; html2CanvasPath: string }> {
  const captureHostPath = resolveCaptureHostPath(profile);
  const html2CanvasPaths = resolveHtml2CanvasPaths(profile);
  const html2CanvasPath = html2CanvasPaths[0];

  await writeWorkspaceFile(container, captureHostPath, CAPTURE_HOST_HTML);
  if (profile.kind === "bundler") {
    const root = profile.workspaceRoot;
    const alt = root ? `${root}/public/capture-host.html` : "public/capture-host.html";
    await writeWorkspaceFile(container, alt, CAPTURE_HOST_HTML);
  }

  let html2canvasText = "";
  try {
    const loaded = await loadHtml2CanvasSource();
    html2canvasText = loaded.text;
    for (const path of html2CanvasPaths) {
      await writeWorkspaceBinaryFile(container, path, loaded.bytes);
    }
    snapshotLog("html2canvas 동일 출처 주입", {
      html2CanvasPaths,
      bytes: loaded.bytes.byteLength,
      inline: true,
    });
  } catch (error) {
    snapshotWarn("html2canvas vendor 주입 실패 — CDN 폴백 불가(COEP)", error);
    throw new Error(
      "캡처 라이브러리(html2canvas)를 WebContainer에 넣지 못했습니다. public/vendor/html2canvas.min.js 를 확인해 주세요.",
    );
  }

  const patchedHtmlPaths: string[] = [];
  const htmlCandidates = resolveHtmlEntryCandidates(profile, files);

  const candidateSet = unique([
    ...htmlCandidates,
    ...(profile.kind === "bundler"
      ? [profile.workspaceRoot ? `${profile.workspaceRoot}/public/index.html` : "public/index.html"]
      : ["index.html"]),
  ]);

  for (const htmlPath of candidateSet) {
    const fromMemory = files[htmlPath]?.content;
    const fromDisk = fromMemory ? null : await readWorkspaceText(container, htmlPath);
    const current = fromMemory ?? fromDisk;
    if (!current) continue;

    const patched = injectBridgeIntoHtml(current, html2canvasText);
    if (patched === current) {
      if (
        current.includes('data-cursor-capture="1"') ||
        current.includes("__CURSOR_CAPTURE_BRIDGE__") ||
        current.includes('data-cursor-html2canvas="1"')
      ) {
        patchedHtmlPaths.push(htmlPath);
      }
      continue;
    }

    await writeWorkspaceFile(container, htmlPath, patched);
    if (files[htmlPath]) {
      files[htmlPath] = { ...files[htmlPath], content: patched, dirty: true };
    }
    patchedHtmlPaths.push(htmlPath);
  }

  if (patchedHtmlPaths.length === 0) {
    snapshotWarn("캡처 브리지를 넣을 HTML을 찾지 못함", { candidates: candidateSet });
  } else {
    snapshotLog("캡처 브리지 HTML 패치", { patchedHtmlPaths, html2canvasInlined: true });
  }

  return { captureHostPath, patchedHtmlPaths, html2CanvasPath };
}
