import { repositoryApi, type RepositoryTreeResponse, type TreeNode } from "@/api/repository";

interface WarmupFile {
  path: string;
  content: string;
}

export interface WorkspaceWarmupResult {
  tree: RepositoryTreeResponse;
  files: Record<string, WarmupFile>;
  truncatedCount: number;
  corePaths: string[];
  deferredPaths: string[];
  coreFailedPaths: string[];
  skippedLargePaths: string[];
}

const EDITABLE_EXTENSIONS = [
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".txt",
  ".yml",
  ".yaml",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".svg",
];

// Preview assets that should be prioritized into the initial warmup set.
const PREVIEW_ASSET_EXTENSIONS = new Set([
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
]);

const ALWAYS_INCLUDE = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "pnpm-workspace.yml",
  "index.html",
  "index.htm",
  "public/index.html",
  "public/index.htm",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.cjs",
  "tailwind.config.mjs",
  "postcss.config.js",
  "postcss.config.mjs",
  "postcss.config.cjs",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
]);

const SKIP_PATH_PARTS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  ".cache/",
  ".idea/",
  ".vscode/",
  "coverage/",
];

const MAX_INITIAL_FILES = 180;
const FAST_PREVIEW_FILE_COUNT = 100;
const BATCH_SIZE = 10;
const FILE_FETCH_TIMEOUT_MS = 15000;
const MAX_PREVIEW_FILE_BYTES = 500 * 1024;

const warmupCache = new Map<string, Promise<WorkspaceWarmupResult>>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) return "";
  return path.slice(lastDot).toLowerCase();
}

function isSkippedPath(path: string): boolean {
  return SKIP_PATH_PARTS.some((part) => path.includes(part));
}

function isEditablePath(path: string): boolean {
  if (ALWAYS_INCLUDE.has(path)) return true;
  const extension = getFileExtension(path);
  return EDITABLE_EXTENSIONS.includes(extension);
}

function getPathPriority(path: string): number {
  if (path.match(/^apps\/[^/]+\/package\.json$/)) return -6;
  if (path.match(/^apps\/[^/]+\/next\.config\.(ts|js|mjs)$/)) return -5;
  if (path.match(/^apps\/[^/]+\/vite\.config\.(ts|js|mjs|cjs)$/)) return -5;
  if (path === "package.json") return -4;
  if (path === "package-lock.json" || path === "yarn.lock" || path === "pnpm-lock.yaml") return -3;
  if (/^vite\.config\.(ts|js|mjs|cjs)$/.test(path)) return -2;
  if (/^(postcss|tailwind)\.config\.(ts|js|mjs|cjs)$/.test(path)) return -2;
  if (path === "tsconfig.json" || path === "tsconfig.app.json" || path === "tsconfig.node.json") return -1;
  if (path.startsWith("apps/")) return 3;
  if (path === "index.html" || path === "index.htm") return 0;
  if (path.endsWith(".html") || path.endsWith(".htm")) return 1;
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return 2;
  if (PREVIEW_ASSET_EXTENSIONS.has(getFileExtension(path))) return 2;
  if (path.endsWith(".css")) return 3;
  if (path.endsWith(".ts") || path.endsWith(".js")) return 4;
  if (path.startsWith("src/")) return 5;
  if (path.startsWith("public/")) return 6;
  if (path.startsWith("assets/")) return 7;
  return 8;
}

function splitFastPreviewPaths(paths: string[]): { corePaths: string[]; deferredPaths: string[] } {
  const sorted = [...paths].sort((a, b) => {
    const byPriority = getPathPriority(a) - getPathPriority(b);
    if (byPriority !== 0) return byPriority;
    return a.localeCompare(b);
  });

  const mustIncludePaths = sorted.filter(
    (path) =>
      /^apps\/[^/]+\/package\.json$/.test(path) ||
      /^apps\/[^/]+\/next\.config\.(ts|js|mjs)$/.test(path) ||
      path === "package.json" ||
      path === "package-lock.json" ||
      path === "yarn.lock" ||
      path === "pnpm-lock.yaml" ||
      path === "index.html" ||
      path === "index.htm" ||
      path.endsWith("/index.html") ||
      path.endsWith("/index.htm") ||
      /^vite\.config\.(ts|js|mjs|cjs)$/.test(path) ||
      /^(postcss|tailwind)\.config\.(ts|js|mjs|cjs)$/.test(path) ||
      PREVIEW_ASSET_EXTENSIONS.has(getFileExtension(path)),
  );

  const coreSet = new Set<string>(mustIncludePaths);
  for (const path of sorted) {
    if (coreSet.size >= FAST_PREVIEW_FILE_COUNT) break;
    coreSet.add(path);
  }

  const corePaths = sorted.filter((path) => coreSet.has(path));
  const deferredPaths = sorted.filter((path) => !coreSet.has(path));

  return { corePaths, deferredPaths };
}

async function runBatched<T>(
  items: readonly T[],
  handler: (item: T) => Promise<void>,
  batchSize: number,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    await Promise.all(chunk.map((item) => handler(item)));
  }
}

async function buildWarmup(repositoryUrl: string): Promise<WorkspaceWarmupResult> {
  const tree = await repositoryApi.getTree(repositoryUrl);

  const candidateNodes = tree.nodes
    .filter((node: TreeNode) => node.type === "blob")
    .filter((node) => !node.size || node.size <= MAX_PREVIEW_FILE_BYTES)
    .filter((node) => !isSkippedPath(node.path))
    .filter((node) => isEditablePath(node.path));

  const skippedLargePaths = tree.nodes
    .filter((node: TreeNode) => node.type === "blob")
    .filter((node) => Boolean(node.size) && (node.size ?? 0) > MAX_PREVIEW_FILE_BYTES)
    .map((node) => node.path);

  const orderedPaths = candidateNodes
    .map((node: TreeNode) => node.path)
    .sort((a, b) => a.localeCompare(b));

  const selectedPaths = orderedPaths.slice(0, MAX_INITIAL_FILES);
  const truncatedCount = Math.max(0, orderedPaths.length - selectedPaths.length);
  const { corePaths, deferredPaths } = splitFastPreviewPaths(selectedPaths);
  const files: Record<string, WarmupFile> = {};
  const coreFailedPaths: string[] = [];

  await runBatched(
    corePaths,
    async (path) => {
      try {
        const response = await withTimeout(
          repositoryApi.getFile(repositoryUrl, path),
          FILE_FETCH_TIMEOUT_MS,
          `파일 로드 타임아웃(${FILE_FETCH_TIMEOUT_MS}ms): ${path}`,
        );
        files[path] = {
          path,
          content: response.content,
        };
      } catch {
        coreFailedPaths.push(path);
      }
    },
    BATCH_SIZE,
  );

  return {
    tree,
    files,
    truncatedCount,
    corePaths,
    deferredPaths,
    coreFailedPaths,
    skippedLargePaths,
  };
}

export function invalidateWorkspaceWarmup(repositoryUrl: string): void {
  warmupCache.delete(repositoryUrl.trim());
}

export function getOrStartWorkspaceWarmup(repositoryUrl: string): Promise<WorkspaceWarmupResult> {
  const key = repositoryUrl.trim();
  if (!key) {
    return Promise.reject(new Error("repositoryUrl이 비어 있습니다."));
  }

  const cached = warmupCache.get(key);
  if (cached) {
    return cached;
  }

  const warmupPromise = buildWarmup(key)
    .then((result) => {
      const hasCandidates = result.corePaths.length > 0;
      const hasFiles = Object.keys(result.files).length > 0;
      if (hasCandidates && !hasFiles) {
        warmupCache.delete(key);
        throw new Error(
          `핵심 파일을 불러오지 못했습니다. (${result.coreFailedPaths.length}개 실패) API 서버 상태를 확인해 주세요.`,
        );
      }
      return result;
    })
    .catch((error) => {
      warmupCache.delete(key);
      throw error;
    });
  warmupCache.set(key, warmupPromise);
  return warmupPromise;
}
