import type { FileSystemTree } from "@webcontainer/api";
import { repositoryApi, type RepositoryFileResponse } from "@/api/repository";
import {
  BATCH_SIZE,
  EDITOR_LANGUAGE_BY_EXT,
  FILE_FETCH_TIMEOUT_MS,
  PREVIEW_AFFECTING_EXTENSIONS,
  PREVIEW_PORT,
} from "./constants";
import type { LoadedFile, TreeItem } from "./types";

export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) return "";
  return path.slice(lastDot).toLowerCase();
}

export function toDisplayError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
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

export function inferLanguage(path: string): string {
  const extension = getFileExtension(path);
  return EDITOR_LANGUAGE_BY_EXT[extension] ?? "plaintext";
}

export function isPreviewAffectingPath(path: string): boolean {
  const extension = getFileExtension(path);
  return PREVIEW_AFFECTING_EXTENSIONS.has(extension);
}

export function buildTree(paths: string[]): TreeItem[] {
  const root: TreeItem[] = [];

  for (const fullPath of paths) {
    const segments = fullPath.split("/");
    let currentLevel = root;
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isLeaf = index === segments.length - 1;
      const existing = currentLevel.find((item) => item.name === segment);

      if (existing) {
        if (!isLeaf) {
          currentLevel = existing.children;
        }
        return;
      }

      const nextItem: TreeItem = {
        name: segment,
        path: currentPath,
        type: isLeaf ? "blob" : "tree",
        children: [],
      };
      currentLevel.push(nextItem);

      if (!isLeaf) {
        currentLevel = nextItem.children;
      }
    });
  }

  const sortRecursively = (items: TreeItem[]) => {
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    items.forEach((item) => sortRecursively(item.children));
  };

  sortRecursively(root);
  return root;
}

export function buildFileSystemTree(files: Record<string, LoadedFile>): FileSystemTree {
  const root: FileSystemTree = {};

  for (const [path, file] of Object.entries(files)) {
    const segments = path.split("/");
    let current = root;

    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1;
      if (isLeaf) {
        current[segment] = {
          file: {
            contents: file.content,
          },
        };
      } else {
        const existing = current[segment];
        if (!existing || !("directory" in existing)) {
          current[segment] = { directory: {} };
        }
        current = (current[segment] as { directory: FileSystemTree }).directory;
      }
    });
  }

  return root;
}

export function findPreviewEntryPath(files: Record<string, LoadedFile>): string | null {
  const paths = Object.keys(files);
  const preferred = ["index.html", "index.htm", "public/index.html", "public/index.htm", "dist/index.html"];
  const found = preferred.find((path) => Boolean(files[path]));
  if (found) return found;

  const htmlPaths = paths
    .filter((path) => path.endsWith(".html") || path.endsWith(".htm"))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
  return htmlPaths[0] ?? null;
}

export function createStaticServerScript(): string {
  return `import http from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";

const rootDir = resolve(process.cwd());
const port = Number(process.env.PORT || ${PREVIEW_PORT});
const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function isWithinRoot(targetPath) {
  const relativePath = relative(rootDir, resolve(targetPath));
  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.startsWith("/"));
}

function resolveRequestPath(rawPath) {
  const pathname = decodeURIComponent((rawPath ?? "/").split("?")[0] || "/");
  const trimmed = normalize(pathname).replace(/^\\\\+/,"").replace(/^\\/+/,"");

  if (!trimmed || trimmed === ".") {
    const indexPath = join(rootDir, "index.html");
    return existsSync(indexPath) ? indexPath : null;
  }

  const candidates = [
    resolve(rootDir, trimmed),
    resolve(rootDir, "public", trimmed),
  ];

  for (const candidate of candidates) {
    if (!isWithinRoot(candidate)) continue;

    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      const indexPath = join(candidate, "index.html");
      if (existsSync(indexPath) && statSync(indexPath).isFile()) {
        return indexPath;
      }
      continue;
    }

    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  const rootIndex = join(rootDir, "index.html");
  if (existsSync(rootIndex)) {
    return rootIndex;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const target = resolveRequestPath(req.url ?? "/");

  if (!target) {
    console.log("STATIC_NOT_FOUND", req.url ?? "/");
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  console.log("STATIC_SERVE", req.url ?? "/", "->", relative(rootDir, target));
  const ext = extname(target).toLowerCase();
  const mime = mimeByExt[ext] ?? "text/plain; charset=utf-8";
  res.setHeader("Content-Type", mime);
  res.end(readFileSync(target));
});

server.listen(port, "0.0.0.0", () => {
  console.log("STATIC_ROOT", rootDir);
  try {
    console.log("STATIC_FILES", readdirSync(rootDir).join(", "));
  } catch (error) {
    console.log("STATIC_FILES_ERROR", error instanceof Error ? error.message : String(error));
  }
  console.log("STATIC_SERVER_READY", port);
});`;
}

export async function runBatched<T>(
  items: readonly T[],
  handler: (item: T) => Promise<void>,
  batchSize: number = BATCH_SIZE,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    await Promise.all(chunk.map((item) => handler(item)));
  }
}

export function selectInitialActivePath(paths: string[]): string | null {
  if (!paths.length) return null;

  const preferred = ["index.html", "index.htm", "public/index.html", "public/index.htm"];
  const found = preferred.find((path) => paths.includes(path));
  if (found) return found;
  const htmlPath = paths.find((path) => path.endsWith(".html") || path.endsWith(".htm"));
  if (htmlPath) return htmlPath;
  return paths[0];
}

export async function ensurePreviewFilesLoaded(
  files: Record<string, LoadedFile>,
  candidatePaths: readonly string[],
  repositoryUrl: string,
): Promise<Record<string, LoadedFile>> {
  if (findPreviewEntryPath(files)) return files;

  const entryCandidates = [
    "index.html",
    "index.htm",
    "public/index.html",
    "public/index.htm",
    ...candidatePaths.filter((path) => path.endsWith(".html") || path.endsWith(".htm")),
  ];

  for (const path of entryCandidates) {
    if (files[path]) return files;
    if (!candidatePaths.includes(path)) continue;
    try {
      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
      return {
        ...files,
        [path]: {
          path,
          content: response.content,
          dirty: false,
        },
      };
    } catch {
      continue;
    }
  }

  return files;
}

export async function fetchRepositoryFileWithTimeout(
  repositoryUrl: string,
  path: string,
): Promise<RepositoryFileResponse> {
  return withTimeout(
    repositoryApi.getFile(repositoryUrl, path),
    FILE_FETCH_TIMEOUT_MS,
    `파일 로드 타임아웃(${FILE_FETCH_TIMEOUT_MS}ms): ${path}`,
  );
}
