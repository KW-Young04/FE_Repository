import type { WebContainer } from "@webcontainer/api";
import type { PreviewProjectProfile } from "@/pages/RepositoryWorkspace/previewProject";
import type { LoadedFile } from "@/pages/RepositoryWorkspace/types";
import { writeWorkspaceBinaryFile, writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { buildCaptureHostBootScript } from "./buildCaptureHostBootScript";
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

function injectHostBootIntoHtml(html: string): string {
  if (html.includes("data-cursor-capture-host-boot")) {
    return html;
  }

  const boot = buildCaptureHostBootScript(CAPTURE_HOST_HTML);
  const snippet = `<script data-cursor-capture-host-boot="1">${boot}</script>`;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${snippet}`);
  }
  if (html.includes("<HEAD>")) {
    return html.replace("<HEAD>", `<HEAD>${snippet}`);
  }
  return `${snippet}\n${html}`;
}

function injectBridgeIntoHtml(html: string): string {
  if (html.includes('data-cursor-capture="1"') || html.includes("__CURSOR_CAPTURE_BRIDGE__")) {
    return html;
  }

  const snippet = `<script data-cursor-capture="1">${CAPTURE_PAGE_BRIDGE_SCRIPT}</script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${snippet}</body>`);
  }
  if (html.includes("</BODY>")) {
    return html.replace("</BODY>", `${snippet}</BODY>`);
  }
  return `${html}\n${snippet}`;
}

async function readWorkspaceText(container: WebContainer, path: string): Promise<string | null> {
  try {
    return await container.fs.readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function loadHtml2CanvasBytes(): Promise<Uint8Array> {
  const base = import.meta.env.BASE_URL || "/";
  const url = new URL("vendor/html2canvas.min.js", window.location.origin + base).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`html2canvas vendor fetch failed (${response.status}) at ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
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
  // Extra copy at public root — some bundlers resolve this more reliably.
  if (profile.kind === "bundler") {
    const root = profile.workspaceRoot;
    const alt = root ? `${root}/public/capture-host.html` : "public/capture-host.html";
    await writeWorkspaceFile(container, alt, CAPTURE_HOST_HTML);
  }

  try {
    const bytes = await loadHtml2CanvasBytes();
    for (const path of html2CanvasPaths) {
      await writeWorkspaceBinaryFile(container, path, bytes);
    }
    snapshotLog("html2canvas 동일 출처 주입", {
      html2CanvasPaths,
      bytes: bytes.byteLength,
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

    let patched = injectHostBootIntoHtml(current);
    patched = injectBridgeIntoHtml(patched);
    if (patched === current) {
      if (current.includes("data-cursor-capture-host-boot") || current.includes("__CURSOR_CAPTURE_BRIDGE__")) {
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
    snapshotLog("캡처 브리지 HTML 패치", { patchedHtmlPaths });
  }

  return { captureHostPath, patchedHtmlPaths, html2CanvasPath };
}
