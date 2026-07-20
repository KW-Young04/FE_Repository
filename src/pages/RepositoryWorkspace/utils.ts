import type { FileSystemTree } from "@webcontainer/api";
import { repositoryApi, type RepositoryFileResponse } from "@/api/repository";
import { CAPTURE_PAGE_BRIDGE_SCRIPT } from "@/preview-capture/capturePageBridgeScript";
import {
  BATCH_SIZE,
  BUNDLER_CONFIG_PATHS,
  EDITOR_LANGUAGE_BY_EXT,
  FILE_FETCH_TIMEOUT_MS,
  PRELOAD_BATCH_SIZE,
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

export function normalizeRepositoryUrl(url: string): string {
  let normalized = decodeURIComponent(url).trim().replace(/\/+$/, "");
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}

const ANSI_ESCAPE_PATTERN = /\x1b(?:[@-Z\\-_]|\[[0-9?]*[ -/]*[@-~])/g;

export function stripAnsiEscapes(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, "");
}

function isImportantTerminalLine(line: string): boolean {
  return /error|ERR!|failed|ENOENT|cannot|missing|warn|exception|✘|×/i.test(line);
}

function isTerminalNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isImportantTerminalLine(trimmed)) return false;
  return /^[\\|/-]+$/.test(trimmed);
}

export function consumeTerminalOutput(
  chunk: string,
  buffer: string,
): { lines: string[]; buffer: string } {
  const combined = buffer + chunk;
  const completeLines = combined.split("\n");
  const nextBuffer = completeLines.pop() ?? "";
  const lines: string[] = [];

  for (const rawLine of completeLines) {
    const withoutCarriage = rawLine.split("\r").pop() ?? rawLine;
    const cleaned = stripAnsiEscapes(withoutCarriage).trim();
    if (!isTerminalNoiseLine(cleaned)) {
      lines.push(cleaned);
    }
  }

  const pendingWithoutCarriage = nextBuffer.split("\r").pop() ?? nextBuffer;
  return {
    lines,
    buffer: stripAnsiEscapes(pendingWithoutCarriage),
  };
}

export function flushTerminalBuffer(buffer: string): string | null {
  const cleaned = stripAnsiEscapes(buffer).trim();
  if (isTerminalNoiseLine(cleaned)) return null;
  return cleaned;
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

export function isPreviewAffectingPath(path: string, runtimeKind: "static" | "bundler" = "static"): boolean {
  if (runtimeKind === "bundler") {
    const extension = getFileExtension(path);
    if (PREVIEW_AFFECTING_EXTENSIONS.has(extension)) return true;
    return BUNDLER_CONFIG_PATHS.has(path);
  }

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
  const captureBridgeLiteral = JSON.stringify(CAPTURE_PAGE_BRIDGE_SCRIPT);

  return `import http from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";

const rootDir = resolve(process.cwd());
const port = Number(process.env.PORT || ${PREVIEW_PORT});
const captureBridge = ${captureBridgeLiteral};
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

  // Only fall back to index.html for navigations without a file extension.
  const requestExt = extname(trimmed).toLowerCase();
  if (!requestExt || requestExt === ".html" || requestExt === ".htm") {
    const rootIndex = join(rootDir, "index.html");
    if (existsSync(rootIndex)) {
      return rootIndex;
    }
  }

  return null;
}

function shouldInjectCapture(rawUrl) {
  return String(rawUrl ?? "").includes("__cursor_capture=1");
}

function stripExternalFontsFromHtml(html) {
  return html
    .replace(/<link\\b[^>]*fonts\\.googleapis\\.com[^>]*>/gi, "")
    .replace(/<link\\b[^>]*fonts\\.gstatic\\.com[^>]*>/gi, "")
    .replace(/<link\\b[^>]*fonts\\.adobe\\.com[^>]*>/gi, "")
    .replace(/<link\\b[^>]*use\\.typekit\\.net[^>]*>/gi, "")
    .replace(/@import\\s+(?:url\\()?['"]?https?:\\/\\/fonts\\.googleapis\\.com[^;]+;?/gi, "");
}

function stripExternalFontsFromCss(css) {
  return css.replace(/@import\\s+(?:url\\()?['"]?https?:\\/\\/fonts\\.googleapis\\.com[^;]+;?/gi, "");
}

function resolveLocalAsset(rootDir, href) {
  if (!href || href.startsWith("data:") || href.startsWith("blob:")) return null;
  if (/^https?:\\/\\//i.test(href) || href.startsWith("//")) return null;

  const cleaned = decodeURIComponent(href.split("?")[0].split("#")[0]).replace(/^\\/+/, "");
  const candidates = [
    resolve(rootDir, cleaned),
    resolve(rootDir, "public", cleaned),
  ];

  for (const candidate of candidates) {
    if (!isWithinRoot(candidate)) continue;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function mimeFromPath(filePath) {
  const ext = extname(filePath).toLowerCase();
  return mimeByExt[ext] ?? "application/octet-stream";
}

function inlineLocalAssets(html, rootDir) {
  let next = html;

  next = next.replace(/<link\\b([^>]*?)href=["']([^"']+)["']([^>]*)>/gi, function (match, pre, href, post) {
    const rel = ((pre + post).match(/rel=["']([^"']+)["']/i) || [])[1] || "";
    if (rel && rel.toLowerCase().indexOf("stylesheet") === -1) {
      return match;
    }
    if (/fonts\\.googleapis|fonts\\.gstatic|fonts\\.adobe|typekit/i.test(href)) {
      return "";
    }
    const assetPath = resolveLocalAsset(rootDir, href);
    if (!assetPath || extname(assetPath).toLowerCase() !== ".css") {
      return match;
    }
    try {
      const css = stripExternalFontsFromCss(readFileSync(assetPath, "utf8"));
      console.log("STATIC_INLINE_CSS", href, "->", relative(rootDir, assetPath));
      return "<style data-cursor-inlined=\\"1\\">" + css + "</style>";
    } catch (error) {
      console.log("STATIC_INLINE_CSS_FAIL", href, error instanceof Error ? error.message : String(error));
      return match;
    }
  });

  next = next.replace(/<img\\b([^>]*?)\\bsrc=["']([^"']+)["']([^>]*)>/gi, function (match, pre, src, post) {
    const assetPath = resolveLocalAsset(rootDir, src);
    if (!assetPath) return match;
    try {
      const bytes = readFileSync(assetPath);
      const mime = mimeFromPath(assetPath);
      const base64 = Buffer.from(bytes).toString("base64");
      console.log("STATIC_INLINE_IMG", src, "->", relative(rootDir, assetPath));
      return "<img" + pre + "src=\\"data:" + mime + ";base64," + base64 + "\\"" + post + ">";
    } catch (error) {
      console.log("STATIC_INLINE_IMG_FAIL", src, error instanceof Error ? error.message : String(error));
      return match;
    }
  });

  return next;
}

function injectCaptureBridge(html, rootDir) {
  var cleaned = stripExternalFontsFromHtml(html);
  cleaned = inlineLocalAssets(cleaned, rootDir);

  var fontOverride =
    "<style data-cursor-font-override=\\"1\\">html,body{font-family:Arial,Helvetica,sans-serif;}</style>";
  if (cleaned.includes("</head>")) {
    cleaned = cleaned.replace("</head>", fontOverride + "</head>");
  } else if (cleaned.includes("</HEAD>")) {
    cleaned = cleaned.replace("</HEAD>", fontOverride + "</HEAD>");
  } else {
    cleaned = fontOverride + cleaned;
  }

  var snippet = "<script data-cursor-capture=\\"1\\">" + captureBridge + "</script>";
  if (cleaned.includes("</body>")) {
    return cleaned.replace("</body>", snippet + "</body>");
  }
  if (cleaned.includes("</BODY>")) {
    return cleaned.replace("</BODY>", snippet + "</BODY>");
  }
  return cleaned + snippet;
}

const server = http.createServer((req, res) => {
  const target = resolveRequestPath(req.url ?? "/");

  if (!target) {
    console.log("STATIC_NOT_FOUND", req.url ?? "/");
    try {
      console.log("STATIC_ROOT_LIST", readdirSync(rootDir).join(", "));
    } catch {}
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  console.log("STATIC_SERVE", req.url ?? "/", "->", relative(rootDir, target));
  const ext = extname(target).toLowerCase();
  const mime = mimeByExt[ext] ?? "text/plain; charset=utf-8";
  res.setHeader("Content-Type", mime);

  if (ext === ".html" || ext === ".htm") {
    let html = readFileSync(target, "utf8");
    html = stripExternalFontsFromHtml(html);
    if (shouldInjectCapture(req.url)) {
      html = injectCaptureBridge(html, rootDir);
    }
    res.end(html);
    return;
  }

  if (ext === ".css") {
    const css = stripExternalFontsFromCss(readFileSync(target, "utf8"));
    res.end(css);
    return;
  }

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
  let nextFiles = files;

  const requiredPaths = [
    "package.json",
    "package-lock.json",
    "index.html",
    "index.htm",
    "public/index.html",
    "public/index.htm",
    ...candidatePaths.filter((path) => path.endsWith(".html") || path.endsWith(".htm")),
  ];

  for (const path of requiredPaths) {
    if (nextFiles[path]) continue;
    if (!candidatePaths.includes(path) && path !== "package.json") continue;
    try {
      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
      nextFiles = {
        ...nextFiles,
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

  if (findPreviewEntryPath(nextFiles) || nextFiles["package.json"]) {
    return nextFiles;
  }

  return nextFiles;
}

const BUNDLER_PRELOAD_MAX_FILES = 150;

const BUNDLER_PRELOAD_SKIP_PARTS = [
  "/registry/",
  "/content/",
  "/fixtures/",
  "/__snapshots__/",
  "/.next/",
  "/node_modules/",
];

function shouldSkipBundlerPreloadPath(path: string): boolean {
  return BUNDLER_PRELOAD_SKIP_PARTS.some((part) => path.includes(part));
}

function getBundlerPathPriority(path: string): number {
  if (path.endsWith("package.json")) return 0;
  if (/next\.config\./.test(path)) return 1;
  if (/\/app\//.test(path) && /\.(tsx|ts|jsx|js)$/.test(path)) return 2;
  if (path.endsWith(".css")) return 3;
  if (/\.(tsx|ts|jsx|js)$/.test(path)) return 4;
  if (path.endsWith(".json")) return 5;
  if (path.endsWith(".mdx") && /\/app\//.test(path)) return 6;
  return 7;
}

function collectBundlerCandidatePaths(
  workspaceRoot: string,
  deferredPaths: readonly string[],
  allTreePaths: readonly string[],
  includeSkipped: boolean,
): string[] {
  if (workspaceRoot) {
    const prefix = `${workspaceRoot}/`;
    return allTreePaths.filter((path) => {
      if (!path.startsWith(prefix)) return false;
      if (!includeSkipped && shouldSkipBundlerPreloadPath(path)) return false;
      return true;
    });
  }

  return deferredPaths.filter((path) => includeSkipped || !shouldSkipBundlerPreloadPath(path));
}

function sortAndCapBundlerPaths(paths: readonly string[], maxFiles: number): string[] {
  return [...paths]
    .sort((a, b) => {
      const byPriority = getBundlerPathPriority(a) - getBundlerPathPriority(b);
      if (byPriority !== 0) return byPriority;
      return a.localeCompare(b);
    })
    .slice(0, maxFiles);
}

export function getBundlerPreloadPaths(
  workspaceRoot: string,
  deferredPaths: readonly string[],
  allTreePaths: readonly string[],
): string[] {
  const candidates = collectBundlerCandidatePaths(workspaceRoot, deferredPaths, allTreePaths, false);
  return sortAndCapBundlerPaths(candidates, BUNDLER_PRELOAD_MAX_FILES);
}

export function getBundlerBackgroundPaths(
  workspaceRoot: string,
  deferredPaths: readonly string[],
  allTreePaths: readonly string[],
  loadedPaths: ReadonlySet<string>,
): string[] {
  const candidates = collectBundlerCandidatePaths(workspaceRoot, deferredPaths, allTreePaths, true);
  return candidates.filter((path) => !loadedPaths.has(path));
}

export async function ensurePackageJsonDiscovery(
  files: Record<string, LoadedFile>,
  allTreePaths: readonly string[],
  repositoryUrl: string,
): Promise<Record<string, LoadedFile>> {
  let nextFiles = files;
  const discoveryPaths = allTreePaths.filter(
    (path) =>
      path === "package.json" ||
      path.endsWith("/package.json") ||
      path === "pnpm-lock.yaml" ||
      path === "pnpm-workspace.yaml" ||
      path === "pnpm-workspace.yml" ||
      path === "yarn.lock" ||
      path === "package-lock.json",
  );

  for (const path of discoveryPaths) {
    if (nextFiles[path]) continue;
    try {
      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
      nextFiles = {
        ...nextFiles,
        [path]: { path, content: response.content, dirty: false },
      };
    } catch {
      continue;
    }
  }

  return nextFiles;
}

export async function preloadRepositoryPaths(
  files: Record<string, LoadedFile>,
  paths: readonly string[],
  repositoryUrl: string,
  maxFiles: number = BUNDLER_PRELOAD_MAX_FILES,
): Promise<Record<string, LoadedFile>> {
  let nextFiles = files;
  const pending = paths.filter((path) => !nextFiles[path]).slice(0, maxFiles);

  await runBatched(
    pending,
    async (path) => {
      try {
        const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
        nextFiles = {
          ...nextFiles,
          [path]: { path, content: response.content, dirty: false },
        };
      } catch {
        // 개별 파일 실패는 무시
      }
    },
    PRELOAD_BATCH_SIZE,
  );

  return nextFiles;
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
