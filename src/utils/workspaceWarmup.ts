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
];

const ALWAYS_INCLUDE = new Set(["index.html", "index.htm", "public/index.html", "public/index.htm"]);

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
const FAST_PREVIEW_FILE_COUNT = 60;
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
  if (path === "index.html" || path === "index.htm") return 0;
  if (path.endsWith(".html") || path.endsWith(".htm")) return 1;
  if (path.endsWith(".css")) return 2;
  if (path.endsWith(".js")) return 3;
  if (path.startsWith("public/")) return 4;
  if (path.startsWith("assets/")) return 5;
  return 6;
}

function splitFastPreviewPaths(paths: string[]): { corePaths: string[]; deferredPaths: string[] } {
  const sorted = [...paths].sort((a, b) => {
    const byPriority = getPathPriority(a) - getPathPriority(b);
    if (byPriority !== 0) return byPriority;
    return a.localeCompare(b);
  });

  const mustIncludePaths = sorted.filter(
    (path) =>
      path === "index.html" ||
      path === "index.htm" ||
      path.endsWith("/index.html") ||
      path.endsWith("/index.htm"),
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

export function getOrStartWorkspaceWarmup(repositoryUrl: string): Promise<WorkspaceWarmupResult> {
  const key = repositoryUrl.trim();
  if (!key) {
    return Promise.reject(new Error("repositoryUrl이 비어 있습니다."));
  }

  const cached = warmupCache.get(key);
  if (cached) {
    return cached;
  }

  const warmupPromise = buildWarmup(key).catch((error) => {
    warmupCache.delete(key);
    throw error;
  });
  warmupCache.set(key, warmupPromise);
  return warmupPromise;
}
