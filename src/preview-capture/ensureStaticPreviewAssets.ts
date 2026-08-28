import type { RepositoryTreeResponse } from "@/api/repository";

const TEXT_ASSET_EXTENSIONS = new Set([
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".svg",
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
]);

const BINARY_ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
]);

function getExtension(path: string): string {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function isPreviewAssetPath(path: string): boolean {
  const extension = getExtension(path);
  return TEXT_ASSET_EXTENSIONS.has(extension) || BINARY_ASSET_EXTENSIONS.has(extension);
}

function parseGithubRepo(repositoryUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repositoryUrl);
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function fetchFromRawGithub(
  repositoryUrl: string,
  branchName: string,
  path: string,
): Promise<Uint8Array> {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) {
    throw new Error(`Invalid repository URL: ${repositoryUrl}`);
  }

  const ref = branchName && branchName.trim() ? branchName.trim() : "HEAD";
  const candidates = Array.from(new Set([ref, "HEAD", "main", "master"].filter(Boolean)));

  let lastError: Error | null = null;
  for (const candidate of candidates) {
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${candidate}/${path}`;
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} for ${rawUrl}`);
        continue;
      }
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error(`Failed to fetch asset ${path}`);
}

/**
 * Loads CSS/image assets for static preview.
 * Uses raw.githubusercontent.com for both text and binary so we don't depend on
 * backend UTF-8 decoding (which breaks images) or auth-gated file APIs.
 */
export async function ensureStaticPreviewAssets(options: {
  repositoryUrl: string;
  branchName: string;
  tree: RepositoryTreeResponse;
  files: Record<string, { path: string; content: string }>;
}): Promise<{
  textFiles: Record<string, { path: string; content: string }>;
  binaryFiles: Record<string, Uint8Array>;
}> {
  const textFiles: Record<string, { path: string; content: string }> = { ...options.files };
  const binaryFiles: Record<string, Uint8Array> = {};

  const assetPaths = options.tree.nodes
    .filter((node) => node.type === "blob")
    .map((node) => node.path)
    .filter((path) => isPreviewAssetPath(path));

  await Promise.all(
    assetPaths.map(async (path) => {
      const extension = getExtension(path);
      try {
        const bytes = await fetchFromRawGithub(options.repositoryUrl, options.branchName, path);
        if (BINARY_ASSET_EXTENSIONS.has(extension)) {
          binaryFiles[path] = bytes;
          return;
        }
        // Always refresh text assets from raw to guarantee CSS is present.
        textFiles[path] = {
          path,
          content: new TextDecoder("utf-8").decode(bytes),
        };
      } catch (error) {
        console.warn("[ensureStaticPreviewAssets] asset failed:", path, error);
      }
    }),
  );

  return { textFiles, binaryFiles };
}
