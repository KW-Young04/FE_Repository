import type { FileSystemTree } from "@webcontainer/api";
import { decodeBase64FileContent, type WorkspaceFileContent } from "@/utils/webContainerFilesystem";
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

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
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

export function isPreviewAffectingPath(
  path: string,
  runtimeKind: "static" | "bundler" = "static",
): boolean {
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

export function toWorkspaceFileContent(
  file: Pick<LoadedFile, "content" | "encoding">,
): WorkspaceFileContent {
  return file.encoding === "base64" ? decodeBase64FileContent(file.content) : file.content;
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
            contents: toWorkspaceFileContent(file),
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
  const preferred = [
    "index.html",
    "index.htm",
    "public/index.html",
    "public/index.htm",
    "dist/index.html",
  ];
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
  if (!cleaned.includes("data-cursor-font-override")) {
    if (cleaned.includes("</head>")) {
      cleaned = cleaned.replace("</head>", fontOverride + "</head>");
    } else if (cleaned.includes("</HEAD>")) {
      cleaned = cleaned.replace("</HEAD>", fontOverride + "</HEAD>");
    } else {
      cleaned = fontOverride + cleaned;
    }
  }

  if (cleaned.includes('data-cursor-capture="1"') || cleaned.includes("__CURSOR_CAPTURE_BRIDGE__")) {
    return cleaned;
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
    const relativePath = relative(rootDir, target).replace(/\\\\/g, "/");
    // Do not rewrite capture-host / vendor pages — they ship their own scripts.
    if (relativePath.includes("__cursor__/")) {
      res.end(html);
      return;
    }
    html = stripExternalFontsFromHtml(html);
    // Always inject bridge so clean preview URLs can be captured without query params.
    html = injectCaptureBridge(html, rootDir);
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

export function createRepositoryFallbackHtml(
  repositoryUrl: string,
  branchName: string,
  files: Record<string, LoadedFile>,
): string {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const filePaths = Object.keys(files).sort((a, b) => a.localeCompare(b));
  const readme = files["README.md"]?.content ?? files["readme.md"]?.content ?? "";
  const appEntry = Object.entries(files).find(
    ([path, file]) =>
      path.endsWith("app.py") && /import\s+streamlit|from\s+streamlit|\bst\./.test(file.content),
  );
  const requirements = Object.entries(files)
    .filter(([path]) => path.endsWith("requirements.txt"))
    .map(([, file]) => file.content)
    .join("\n");
  const isStreamlit =
    Boolean(appEntry) || /(^|\n)\s*streamlit\b/i.test(requirements) || /Streamlit/i.test(readme);

  const repoName = repositoryUrl.replace(/^https:\/\/github\.com\//, "");
  const readmePreview = readme.split(/\r?\n/).slice(0, 28).join("\n").trim();
  const listItems = filePaths
    .slice(0, 28)
    .map((path) => `<li><span>${escapeHtml(path)}</span></li>`)
    .join("");

  if (isStreamlit) {
    const source = appEntry?.[1].content ?? readme;
    const stringArg = (name: string) => {
      const match = source.match(new RegExp(`st\\.${name}\\(\\s*[\"']([^\"']+)[\"']`));
      return match?.[1] ?? "";
    };
    const allLabels = Array.from(
      source.matchAll(
        /st\.(selectbox|radio|multiselect|slider|text_input|number_input)\(\s*["']([^"']+)["']/g,
      ),
    )
      .map((match) => ({ type: match[1], label: match[2] }))
      .slice(0, 6);
    const buttons = Array.from(source.matchAll(/st\.button\(\s*["']([^"']+)["']/g))
      .map((match) => match[1])
      .slice(0, 3);
    const title =
      stringArg("title") ||
      stringArg("header") ||
      readme.match(/^#\s+(.+)$/m)?.[1] ||
      "Streamlit App";
    const subtitle =
      stringArg("caption") || stringArg("subheader") || "Streamlit 기반 웹 애플리케이션 미리보기";
    const controlHtml =
      allLabels.length > 0
        ? allLabels
            .map(
              (item) =>
                `<label><span>${escapeHtml(item.label)}</span><div class="control">${item.type === "slider" ? "50" : "선택하세요"}</div></label>`,
            )
            .join("")
        : `<label><span>입력 항목</span><div class="control">선택하세요</div></label>`;
    const buttonHtml =
      buttons.length > 0
        ? buttons.map((label) => `<button>${escapeHtml(label)}</button>`).join("")
        : `<button>추천 받기</button>`;

    return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { font-family: Inter, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #f6f7fb; }
    body { margin: 0; background: linear-gradient(180deg, #fff7ed 0%, #f8fafc 34%, #eef6ff 100%); }
    .app { width: min(980px, calc(100% - 48px)); margin: 0 auto; padding: 42px 0 54px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 900; color: #334155; }
    .bean { width: 42px; height: 42px; border-radius: 50%; background: #8b5cf6; box-shadow: inset -10px -12px 0 rgba(0,0,0,.12); }
    .chip { border: 1px solid #e9d5ff; background: #faf5ff; color: #7c3aed; padding: 7px 11px; border-radius: 999px; font-size: 12px; font-weight: 800; }
    .hero { padding: 30px; border: 1px solid #eadfd0; background: rgba(255,255,255,.86); box-shadow: 0 18px 45px rgba(15,23,42,.08); }
    h1 { margin: 0; font-size: clamp(30px, 4vw, 48px); line-height: 1.15; letter-spacing: 0; }
    .subtitle { margin: 12px 0 0; max-width: 760px; color: #64748b; font-size: 17px; line-height: 1.75; font-weight: 650; }
    .grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 18px; margin-top: 18px; }
    .panel { border: 1px solid #dbe3ef; background: rgba(255,255,255,.92); padding: 24px; box-shadow: 0 12px 30px rgba(15,23,42,.06); }
    h2 { margin: 0 0 16px; font-size: 18px; }
    label { display: block; margin-bottom: 14px; }
    label span { display: block; margin-bottom: 7px; color: #334155; font-size: 13px; font-weight: 800; }
    .control { height: 42px; display: flex; align-items: center; border: 1px solid #cbd5e1; background: #fff; padding: 0 12px; color: #64748b; font-size: 14px; }
    button { width: 100%; height: 46px; border: 0; background: #7c3aed; color: white; font-size: 15px; font-weight: 900; cursor: pointer; }
    .result { min-height: 220px; display: grid; align-content: center; text-align: center; background: #0f172a; color: white; }
    .cup { width: 92px; height: 76px; margin: 0 auto 18px; border: 9px solid #fff; border-top: 0; border-radius: 0 0 24px 24px; position: relative; }
    .cup:after { content: ""; position: absolute; right: -34px; top: 13px; width: 28px; height: 28px; border: 8px solid #fff; border-left: 0; border-radius: 0 18px 18px 0; }
    .result strong { display: block; font-size: 24px; }
    .result p { margin: 8px 0 0; color: #cbd5e1; font-weight: 700; }
    .notice { margin-top: 18px; color: #475569; font-size: 13px; line-height: 1.7; font-weight: 700; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } .app { width: min(100% - 28px, 980px); padding-top: 24px; } }
  </style>
</head>
<body>
  <main class="app">
    <div class="top"><div class="brand"><span class="bean"></span><span>${escapeHtml(repoName)}</span></div><span class="chip">branch: ${escapeHtml(branchName || "HEAD")}</span></div>
    <section class="hero"><h1>${escapeHtml(title)}</h1><p class="subtitle">${escapeHtml(subtitle)}</p></section>
    <section class="grid">
      <div class="panel"><h2>사용자 입력</h2>${controlHtml}${buttonHtml}</div>
      <div class="panel result"><div><div class="cup"></div><strong>추천 결과</strong><p>선택한 조건에 맞는 메뉴 조합이 표시됩니다.</p></div></div>
    </section>
    <p class="notice">Streamlit/Python 앱은 브라우저 런타임에서 직접 실행할 수 없어, front/app.py 코드를 기반으로 디자인 확인용 정적 미리보기를 생성했습니다.</p>
  </main>
</body>
</html>`;
  }

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Repository Preview</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    main { min-height: 100vh; box-sizing: border-box; padding: 40px; display: grid; align-content: center; }
    .panel { width: min(880px, 100%); margin: 0 auto; border: 1px solid #dbe3ef; background: white; box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08); }
    .header { padding: 28px 30px 22px; border-bottom: 1px solid #e5eaf2; }
    h1 { margin: 0; font-size: 28px; line-height: 1.25; letter-spacing: 0; }
    p { margin: 10px 0 0; color: #475569; font-size: 15px; line-height: 1.7; }
    .meta { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { border: 1px solid #ddd6fe; background: #f5f3ff; color: #6d28d9; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .content { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    section { padding: 26px 30px; min-width: 0; }
    section + section { border-left: 1px solid #e5eaf2; }
    h2 { margin: 0 0 14px; font-size: 16px; }
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 9px; }
    li { min-width: 0; border: 1px solid #e2e8f0; background: #f8fafc; padding: 9px 10px; font-size: 13px; font-weight: 700; color: #334155; }
    li span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    pre { margin: 0; max-height: 360px; overflow: auto; white-space: pre-wrap; word-break: break-word; border: 1px solid #e2e8f0; background: #0f172a; color: #e2e8f0; padding: 14px; font-size: 12px; line-height: 1.55; }
    .notice { margin-top: 18px; color: #be123c; font-size: 13px; font-weight: 700; }
    @media (max-width: 760px) { main { padding: 20px; } .content { grid-template-columns: 1fr; } section + section { border-left: 0; border-top: 1px solid #e5eaf2; } }
  </style>
</head>
<body>
  <main>
    <div class="panel">
      <div class="header">
        <h1>${escapeHtml(repoName)}</h1>
        <p>이 저장소의 코드는 불러왔지만, 브라우저에서 바로 실행할 수 있는 프론트 진입 파일을 찾지 못했습니다.</p>
        <div class="meta"><span class="chip">branch: ${escapeHtml(branchName || "HEAD")}</span><span class="chip">loaded files: ${filePaths.length}</span></div>
        <p class="notice">실제 화면 프리뷰를 보려면 index.html 또는 package.json이 있는 웹 프론트 프로젝트가 저장소에 포함되어야 합니다.</p>
      </div>
      <div class="content">
        <section><h2>불러온 파일</h2><ul>${listItems || "<li><span>표시할 파일이 없습니다.</span></li>"}</ul></section>
        <section><h2>README 미리보기</h2><pre>${escapeHtml(readmePreview || "README.md가 없거나 아직 불러오지 않았습니다.")}</pre></section>
      </div>
    </div>
  </main>
</body>
</html>`;
}

export function createRuntimeFailureHtml(
  repositoryUrl: string,
  branchName: string,
  errorMessage: string,
): string {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const repoName = repositoryUrl.replace(/^https:\/\/github\.com\//, "");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview Failed</title>
  <style>
    :root { font-family: Inter, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; }
    main { width: min(760px, calc(100% - 48px)); border: 1px solid #fecdd3; background: #fff; padding: 30px; box-shadow: 0 18px 45px rgba(15,23,42,.08); }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
    p { color: #475569; line-height: 1.7; font-weight: 650; }
    .chip { display: inline-flex; margin: 12px 8px 18px 0; border: 1px solid #ddd6fe; background: #f5f3ff; color: #6d28d9; padding: 7px 11px; border-radius: 999px; font-size: 12px; font-weight: 800; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 14px; font-size: 12px; line-height: 1.55; overflow: auto; max-height: 240px; }
    .notice { color: #be123c; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(repoName)}</h1>
    <span class="chip">branch: ${escapeHtml(branchName || "HEAD")}</span>
    <p class="notice">프리뷰 실행 중 의존성 설치 또는 개발 서버 실행에 실패했습니다.</p>
    <p>코드는 정상적으로 불러왔지만, 이 저장소는 브라우저 프리뷰 안에서 패키지 설치와 실행이 필요합니다. 설치가 실패하면 실제 화면 대신 이 안내 화면을 표시합니다.</p>
    <pre>${escapeHtml(errorMessage)}</pre>
  </main>
</body>
</html>`;
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
  branchName?: string,
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
    ...candidatePaths.filter((path) => /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$/.test(path)),
    ...candidatePaths.filter(
      (path) => path.startsWith("src/assets/") || path.startsWith("public/"),
    ),
  ];

  for (const path of requiredPaths) {
    if (nextFiles[path]) continue;
    if (!candidatePaths.includes(path)) continue;
    try {
      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path, branchName);
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
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$/.test(path)) return 4;
  if (/\.(tsx|ts|jsx|js)$/.test(path)) return 5;
  if (path.endsWith(".json")) return 6;
  if (path.endsWith(".mdx") && /\/app\//.test(path)) return 7;
  return 8;
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

  const sourcePaths = includeSkipped ? allTreePaths : [...deferredPaths, ...allTreePaths];
  return Array.from(new Set(sourcePaths)).filter(
    (path) => includeSkipped || !shouldSkipBundlerPreloadPath(path),
  );
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
  const candidates = collectBundlerCandidatePaths(
    workspaceRoot,
    deferredPaths,
    allTreePaths,
    false,
  );
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
  branchName?: string,
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
      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path, branchName);
      nextFiles = {
        ...nextFiles,
        [path]: { path, content: response.content, encoding: response.encoding, dirty: false },
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
  branchName?: string,
  maxFiles: number = BUNDLER_PRELOAD_MAX_FILES,
): Promise<Record<string, LoadedFile>> {
  let nextFiles = files;
  const pending = paths.filter((path) => !nextFiles[path]).slice(0, maxFiles);

  await runBatched(
    pending,
    async (path) => {
      try {
        const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path, branchName);
        nextFiles = {
          ...nextFiles,
          [path]: { path, content: response.content, encoding: response.encoding, dirty: false },
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
  branchName?: string,
): Promise<RepositoryFileResponse> {
  return withTimeout(
    repositoryApi.getFile(repositoryUrl, path, branchName),
    FILE_FETCH_TIMEOUT_MS,
    `파일 로드 타임아웃(${FILE_FETCH_TIMEOUT_MS}ms): ${path}`,
  );
}
