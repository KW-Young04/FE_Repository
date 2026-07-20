import type { WebContainer } from "@webcontainer/api";
import type { PreviewProjectProfile } from "@/pages/RepositoryWorkspace/previewProject";
import type { LoadedFile } from "@/pages/RepositoryWorkspace/types";
import { writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { CAPTURE_HOST_HTML } from "./captureHostTemplate";
import { CAPTURE_PAGE_BRIDGE_SCRIPT } from "./capturePageBridgeScript";

function resolveCaptureHostPath(profile: PreviewProjectProfile): string {
  if (profile.kind === "bundler") {
    const root = profile.workspaceRoot;
    return root
      ? `${root}/public/__cursor__/capture-host.html`
      : "public/__cursor__/capture-host.html";
  }

  return "__cursor__/capture-host.html";
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

  // Fall back to any html file already loaded.
  return Object.keys(files)
    .filter((path) => path.endsWith(".html") || path.endsWith(".htm"))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))
    .slice(0, 3);
}

function injectBridgeIntoHtml(html: string): string {
  if (html.includes("data-cursor-capture=\"1\"") || html.includes("CURSOR_PREVIEW_CAPTURE")) {
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

export async function injectCaptureAssets(
  container: WebContainer,
  profile: PreviewProjectProfile,
  files: Record<string, LoadedFile> = {},
): Promise<{ captureHostPath: string; patchedHtmlPaths: string[] }> {
  const captureHostPath = resolveCaptureHostPath(profile);
  await writeWorkspaceFile(container, captureHostPath, CAPTURE_HOST_HTML);

  const patchedHtmlPaths: string[] = [];
  const htmlCandidates = resolveHtmlEntryCandidates(profile, files);

  for (const htmlPath of htmlCandidates) {
    const current = files[htmlPath]?.content;
    if (!current) continue;
    const patched = injectBridgeIntoHtml(current);
    if (patched === current) continue;
    await writeWorkspaceFile(container, htmlPath, patched);
    patchedHtmlPaths.push(htmlPath);
  }

  return { captureHostPath, patchedHtmlPaths };
}
