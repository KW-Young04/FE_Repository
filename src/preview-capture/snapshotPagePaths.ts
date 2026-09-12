import { MAX_STATIC_SNAPSHOT_PAGES } from "@/workspace/constants";

export function getStaticSnapshotPagePaths(
  files: Record<string, { path: string }>,
  previewEntryPath: string | null,
): string[] {
  const htmlPaths = Object.keys(files)
    .filter((path) => path.endsWith(".html") || path.endsWith(".htm"))
    .sort((a, b) => {
      const aDepth = a.split("/").length;
      const bDepth = b.split("/").length;
      return aDepth - bDepth || a.localeCompare(b);
    });

  const ordered = [
    previewEntryPath,
    "index.html",
    "index.htm",
    "public/index.html",
    "public/index.htm",
    ...htmlPaths,
  ].filter((path): path is string => typeof path === "string" && Boolean(files[path]));

  return Array.from(new Set(ordered)).slice(0, MAX_STATIC_SNAPSHOT_PAGES);
}

export function buildStaticSnapshotUrl(previewUrl: string, pagePath: string, index: number): string {
  if (index === 0 && (pagePath === "index.html" || pagePath === "index.htm")) {
    return previewUrl;
  }
  return new URL(encodeURI(pagePath), previewUrl).toString();
}
