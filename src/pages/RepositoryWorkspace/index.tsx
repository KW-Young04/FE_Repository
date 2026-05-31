import { WebContainer, type FileSystemTree, type WebContainerProcess } from "@webcontainer/api";
import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Button";
import {
  repositoryApi,
  type RepositoryFileResponse,
  type RepositoryTreeResponse,
  type TreeNode,
} from "@/api/repository";

type ProjectRuntime = "framework" | "static";
type PreviewStatus = "idle" | "loading" | "ready" | "error";

interface LoadedFile {
  path: string;
  content: string;
  dirty: boolean;
}

interface TreeItem {
  name: string;
  path: string;
  type: "tree" | "blob";
  children: TreeItem[];
}

interface PackageManagerInfo {
  manager: "npm" | "pnpm" | "yarn";
  reason: string;
}

interface LoadDiagnostics {
  treeMs: number | null;
  coreMs: number | null;
  runtimeMs: number | null;
  backgroundMs: number | null;
  coreFailedPaths: string[];
  backgroundFailedPaths: string[];
  lastError: string | null;
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

const ALWAYS_INCLUDE = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "vite.config.ts",
  "vite.config.js",
  "index.html",
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
const FAST_PREVIEW_FILE_COUNT = 60;
const BATCH_SIZE = 10;
const FILE_FETCH_TIMEOUT_MS = 15000;
const MAX_PREVIEW_FILE_BYTES = 500 * 1024;
const WEB_CONTAINER_BOOT_TIMEOUT_MS = 12000;
const NPM_INSTALL_TIMEOUT_MS = 120000;
const SERVER_READY_TIMEOUT_MS = 30000;
const EDITOR_LANGUAGE_BY_EXT: Record<string, string> = {
  ".html": "html",
  ".css": "css",
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".json": "json",
  ".md": "markdown",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "html",
  ".svelte": "html",
  ".yml": "yaml",
  ".yaml": "yaml",
};

const PREVIEW_PORT = 4173;
let sharedWebContainer: WebContainer | null = null;
let sharedWebContainerPromise: Promise<WebContainer> | null = null;

async function getSharedWebContainer(): Promise<WebContainer> {
  if (sharedWebContainer) {
    return sharedWebContainer;
  }

  if (!sharedWebContainerPromise) {
    sharedWebContainerPromise = WebContainer.boot()
      .then((instance) => {
        sharedWebContainer = instance;
        return instance;
      })
      .catch((error) => {
        sharedWebContainerPromise = null;
        throw error;
      });
  }

  return sharedWebContainerPromise;
}

async function acquireWebContainer(): Promise<WebContainer> {
  try {
    return await withTimeout(
      getSharedWebContainer(),
      WEB_CONTAINER_BOOT_TIMEOUT_MS,
      `WebContainer 부팅 타임아웃(${WEB_CONTAINER_BOOT_TIMEOUT_MS}ms)`,
    );
  } catch (error) {
    if (!sharedWebContainer) {
      sharedWebContainerPromise = null;
    }
    throw error;
  }
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

function toDisplayError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

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

function inferLanguage(path: string): string {
  const extension = getFileExtension(path);
  return EDITOR_LANGUAGE_BY_EXT[extension] ?? "plaintext";
}

function buildTree(paths: string[]): TreeItem[] {
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

function buildFileSystemTree(files: Record<string, LoadedFile>): FileSystemTree {
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

function createStaticServerScript(): string {
  return `import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const rootDir = process.cwd();
const port = Number(process.env.PORT || ${PREVIEW_PORT});
const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

const server = http.createServer((req, res) => {
  const rawPath = req.url?.split("?")[0] ?? "/";
  const safePath = normalize(rawPath).replace(/^\\\\+/, "").replace(/^\\/+/,"");
  let target = resolve(rootDir, safePath);

  if (!target.startsWith(rootDir)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  if (rawPath === "/") {
    target = join(rootDir, "index.html");
  }

  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, "index.html");
  }

  if (!existsSync(target)) {
    const fallback = join(rootDir, "index.html");
    if (existsSync(fallback)) {
      target = fallback;
    } else {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
  }

  const ext = extname(target).toLowerCase();
  const mime = mimeByExt[ext] ?? "text/plain; charset=utf-8";
  res.setHeader("Content-Type", mime);
  res.end(readFileSync(target));
});

server.listen(port, "0.0.0.0", () => {
  console.log("STATIC_SERVER_READY", port);
});`;
}

function createViteFallbackConfig(): string {
  return `import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: ${PREVIEW_PORT},
    strictPort: true,
  },
});`;
}

function usesTailwindVitePlugin(files: Record<string, LoadedFile>): boolean {
  const viteConfigPaths = ["vite.config.ts", "vite.config.js", "vite.config.mjs", "vite.config.cjs"];
  return viteConfigPaths.some((configPath) => {
    const file = files[configPath];
    if (!file) return false;
    return file.content.includes("@tailwindcss/vite") || file.content.includes("tailwindcss()");
  });
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

function getPathPriority(path: string): number {
  if (path === "package.json") return 0;
  if (path === "package-lock.json" || path === "pnpm-lock.yaml" || path === "yarn.lock") return 1;
  if (path === "index.html") return 2;
  if (path.startsWith("vite.config.") || path.startsWith("tsconfig")) return 3;
  if (path.startsWith("src/main.") || path.startsWith("src/App.")) return 4;
  if (path.startsWith("src/")) return 5;
  if (path.startsWith("public/")) return 6;
  return 7;
}

function splitFastPreviewPaths(paths: string[]): { corePaths: string[]; deferredPaths: string[] } {
  const sorted = [...paths].sort((a, b) => {
    const byPriority = getPathPriority(a) - getPathPriority(b);
    if (byPriority !== 0) return byPriority;
    return a.localeCompare(b);
  });

  const mustIncludePaths = sorted.filter(
    (path) =>
      path === "package.json" ||
      path.endsWith("/package.json") ||
      path === "package-lock.json" ||
      path === "pnpm-lock.yaml" ||
      path === "yarn.lock",
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

function selectInitialActivePath(paths: string[]): string | null {
  if (!paths.length) return null;

  const preferred = ["src/main.tsx", "src/App.tsx", "index.html"];
  const found = preferred.find((path) => paths.includes(path));
  if (found) return found;
  return paths[0];
}

async function loadRepositoryFiles(
  repositoryUrl: string,
  treeResponse: RepositoryTreeResponse,
  options?: {
    onProgress?: (done: number, total: number) => void;
    onFileFailed?: (path: string, reason: string) => void;
  },
): Promise<{
  files: Record<string, LoadedFile>;
  truncatedCount: number;
  corePaths: string[];
  deferredPaths: string[];
  coreFailedPaths: string[];
  skippedLargePaths: string[];
}> {
  const candidateNodes = treeResponse.nodes
    .filter((node: TreeNode) => node.type === "blob")
    .filter((node) => !node.size || node.size <= MAX_PREVIEW_FILE_BYTES)
    .filter((node) => !isSkippedPath(node.path))
    .filter((node) => isEditablePath(node.path));
  const skippedLargePaths = treeResponse.nodes
    .filter((node: TreeNode) => node.type === "blob")
    .filter((node) => Boolean(node.size) && (node.size ?? 0) > MAX_PREVIEW_FILE_BYTES)
    .map((node) => node.path);

  const candidatePaths = candidateNodes
    .map((node: TreeNode) => node.path)
    .filter((path) => !isSkippedPath(path))
    .filter((path) => isEditablePath(path));

  const orderedPaths = candidatePaths.sort((a, b) => a.localeCompare(b));
  const selectedPaths = orderedPaths.slice(0, MAX_INITIAL_FILES);
  const truncatedCount = Math.max(0, orderedPaths.length - selectedPaths.length);
  const { corePaths, deferredPaths } = splitFastPreviewPaths(selectedPaths);
  const files: Record<string, LoadedFile> = {};
  const coreFailedPaths: string[] = [];

  let done = 0;
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
          dirty: false,
        };
      } catch (error) {
        coreFailedPaths.push(path);
        options?.onFileFailed?.(path, toDisplayError(error));
      } finally {
        done += 1;
        options?.onProgress?.(done, corePaths.length);
      }
    },
    BATCH_SIZE,
  );

  return {
    files,
    truncatedCount,
    corePaths,
    deferredPaths,
    coreFailedPaths,
    skippedLargePaths,
  };
}

async function fetchRepositoryFileWithTimeout(
  repositoryUrl: string,
  path: string,
): Promise<RepositoryFileResponse> {
  return withTimeout(
    repositoryApi.getFile(repositoryUrl, path),
    FILE_FETCH_TIMEOUT_MS,
    `파일 로드 타임아웃(${FILE_FETCH_TIMEOUT_MS}ms): ${path}`,
  );
}

function hasWorkspaceProtocol(packageJson: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}): boolean {
  const groups = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ];

  return groups.some((group) =>
    Object.values(group ?? {}).some((value) => typeof value === "string" && value.startsWith("workspace:")),
  );
}

function resolvePackageManager(
  files: Record<string, LoadedFile>,
  packageJson: {
    packageManager?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  },
): PackageManagerInfo {
  const packageManagerField = packageJson.packageManager ?? "";
  const workspaceProtocol = hasWorkspaceProtocol(packageJson);

  if (packageManagerField.startsWith("pnpm")) {
    return { manager: "pnpm", reason: "package.json의 packageManager가 pnpm으로 지정됨" };
  }
  if (packageManagerField.startsWith("yarn")) {
    return { manager: "yarn", reason: "package.json의 packageManager가 yarn으로 지정됨" };
  }
  if (packageManagerField.startsWith("npm")) {
    return { manager: "npm", reason: "package.json의 packageManager가 npm으로 지정됨" };
  }

  if (files["pnpm-lock.yaml"]) {
    return { manager: "pnpm", reason: "pnpm-lock.yaml 감지" };
  }
  if (files["yarn.lock"]) {
    return { manager: "yarn", reason: "yarn.lock 감지" };
  }
  if (workspaceProtocol) {
    return { manager: "pnpm", reason: "workspace:* 의존성 감지로 pnpm 우선" };
  }

  return { manager: "npm", reason: "기본 전략(npm)" };
}

export default function RepositoryWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositoryUrl = searchParams.get("repo") ?? "";

  const [tree, setTree] = useState<RepositoryTreeResponse | null>(null);
  const [filesByPath, setFilesByPath] = useState<Record<string, LoadedFile>>({});
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("저장소를 준비하는 중입니다.");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [truncatedCount, setTruncatedCount] = useState(0);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<LoadDiagnostics>({
    treeMs: null,
    coreMs: null,
    runtimeMs: null,
    backgroundMs: null,
    coreFailedPaths: [],
    backgroundFailedPaths: [],
    lastError: null,
  });

  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [runtimeLog, setRuntimeLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  const webContainerRef = useRef<WebContainer | null>(null);
  const runtimeProcessRef = useRef<WebContainerProcess | null>(null);
  const outputPumpAbortRef = useRef<AbortController | null>(null);
  const pendingWriteTimersRef = useRef<Map<string, number>>(new Map());
  const serverReadySubscribedRef = useRef(false);
  const loadSessionIdRef = useRef(0);
  const previewReadyRef = useRef(false);
  const serverReadyTimeoutRef = useRef<number | null>(null);

  const activeFile = useMemo(() => {
    if (!activePath) return null;
    return filesByPath[activePath] ?? null;
  }, [activePath, filesByPath]);

  const treeItems = useMemo(() => buildTree(Object.keys(filesByPath)), [filesByPath]);

  const appendRuntimeLog = useCallback((line: string) => {
    setRuntimeLog((prev) => {
      const next = [...prev, line];
      if (next.length > 300) {
        return next.slice(next.length - 300);
      }
      return next;
    });
  }, []);

  const logEvent = useCallback(
    (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const line = `[${timestamp}] ${message}`;
      appendRuntimeLog(line);
      console.info("[RepositoryWorkspace]", line);
    },
    [appendRuntimeLog],
  );

  const stopRuntimeProcess = useCallback(async () => {
    outputPumpAbortRef.current?.abort();
    outputPumpAbortRef.current = null;
    if (runtimeProcessRef.current) {
      runtimeProcessRef.current.kill();
      runtimeProcessRef.current = null;
    }
  }, []);

  const runCommand = useCallback(
    async (
      container: WebContainer,
      command: string,
      args: string[],
      options?: { cwd?: string; onOutput?: (line: string) => void },
    ) => {
      const process = await container.spawn(command, args, options?.cwd ? { cwd: options.cwd } : undefined);
      const abortController = new AbortController();
      outputPumpAbortRef.current = abortController;

      const reader = process.output.getReader();
      void (async () => {
        while (true) {
          if (abortController.signal.aborted) return;
          const { done, value } = await reader.read();
          if (done) return;
          if (!value) continue;
          const lines = value.split("\n").filter((line) => line.trim());
          lines.forEach((line) => {
            appendRuntimeLog(line);
            options?.onOutput?.(line);
          });
        }
      })();

      const exitCode = await process.exit;
      if (!abortController.signal.aborted) {
        outputPumpAbortRef.current = null;
      }
      if (exitCode !== 0) {
        throw new Error(`${command} ${args.join(" ")} 실행에 실패했습니다. (exit: ${exitCode})`);
      }
    },
    [appendRuntimeLog],
  );

  const startRuntime = useCallback(
    async (files: Record<string, LoadedFile>) => {
      setPreviewStatus("loading");
      previewReadyRef.current = false;
      setRuntimeError(null);
      setPreviewUrl("");
      setRuntimeLog([]);
      logEvent("프리뷰 런타임 시작");

      const packageJsonFile = files["package.json"];
      const runtimeType: ProjectRuntime = packageJsonFile ? "framework" : "static";
      logEvent(`런타임 타입: ${runtimeType}`);

      const container = await acquireWebContainer();
      webContainerRef.current = container;

      const fsTree = buildFileSystemTree(files);
      await container.mount(fsTree);
      logEvent(`WebContainer mount 완료 (파일 ${Object.keys(files).length}개)`);

      if (!serverReadySubscribedRef.current) {
        container.on("server-ready", (_port, url) => {
          previewReadyRef.current = true;
          if (serverReadyTimeoutRef.current) {
            window.clearTimeout(serverReadyTimeoutRef.current);
            serverReadyTimeoutRef.current = null;
          }
          setPreviewUrl(url);
          setPreviewStatus("ready");
          logEvent(`server-ready 수신: ${url}`);
        });
        serverReadySubscribedRef.current = true;
      }

      await stopRuntimeProcess();

      if (runtimeType === "framework") {
        appendRuntimeLog("의존성 설치 중...");
        const pkg = JSON.parse(packageJsonFile.content) as {
          scripts?: Record<string, string>;
          packageManager?: string;
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          peerDependencies?: Record<string, string>;
          optionalDependencies?: Record<string, string>;
        };
        const shouldUseTailwindFallback = usesTailwindVitePlugin(files);
        const packageManagerInfo = resolvePackageManager(files, pkg);
        logEvent(`패키지 매니저 선택: ${packageManagerInfo.manager} (${packageManagerInfo.reason})`);
        const installStart = Date.now();

        if (packageManagerInfo.manager === "pnpm") {
          await withTimeout(
            runCommand(container, "corepack", ["pnpm", "install", "--no-frozen-lockfile"]),
            NPM_INSTALL_TIMEOUT_MS,
            `pnpm install 타임아웃(${NPM_INSTALL_TIMEOUT_MS}ms)`,
          );
          logEvent(`pnpm install 완료 (${formatDuration(Date.now() - installStart)})`);
        } else if (packageManagerInfo.manager === "yarn") {
          await withTimeout(
            runCommand(container, "corepack", ["yarn", "install"]),
            NPM_INSTALL_TIMEOUT_MS,
            `yarn install 타임아웃(${NPM_INSTALL_TIMEOUT_MS}ms)`,
          );
          logEvent(`yarn install 완료 (${formatDuration(Date.now() - installStart)})`);
        } else {
          await withTimeout(
            runCommand(container, "npm", ["install"]),
            NPM_INSTALL_TIMEOUT_MS,
            `npm install 타임아웃(${NPM_INSTALL_TIMEOUT_MS}ms)`,
          );
          logEvent(`npm install 완료 (${formatDuration(Date.now() - installStart)})`);
        }

        appendRuntimeLog("개발 서버 실행 중...");

        if (pkg.scripts?.dev) {
          let process: WebContainerProcess;
          if (shouldUseTailwindFallback) {
            await container.fs.writeFile(".cursor-vite-fallback.config.mjs", createViteFallbackConfig());
            logEvent("Tailwind native addon 충돌 회피를 위해 fallback Vite config로 실행합니다.");
            process =
              packageManagerInfo.manager === "pnpm"
                ? await container.spawn("corepack", [
                    "pnpm",
                    "exec",
                    "vite",
                    "--config",
                    ".cursor-vite-fallback.config.mjs",
                    "--host",
                    "0.0.0.0",
                    "--port",
                    String(PREVIEW_PORT),
                  ])
                : packageManagerInfo.manager === "yarn"
                  ? await container.spawn("corepack", [
                      "yarn",
                      "vite",
                      "--config",
                      ".cursor-vite-fallback.config.mjs",
                      "--host",
                      "0.0.0.0",
                      "--port",
                      String(PREVIEW_PORT),
                    ])
                  : await container.spawn("npx", [
                      "vite",
                      "--config",
                      ".cursor-vite-fallback.config.mjs",
                      "--host",
                      "0.0.0.0",
                      "--port",
                      String(PREVIEW_PORT),
                    ]);
          } else {
            process =
              packageManagerInfo.manager === "pnpm"
                ? await container.spawn("corepack", [
                    "pnpm",
                    "run",
                    "dev",
                    "--",
                    "--host",
                    "0.0.0.0",
                    "--port",
                    String(PREVIEW_PORT),
                  ])
                : packageManagerInfo.manager === "yarn"
                  ? await container.spawn("corepack", [
                      "yarn",
                      "run",
                      "dev",
                      "--host",
                      "0.0.0.0",
                      "--port",
                      String(PREVIEW_PORT),
                    ])
                  : await container.spawn("npm", [
                      "run",
                      "dev",
                      "--",
                      "--host",
                      "0.0.0.0",
                      "--port",
                      String(PREVIEW_PORT),
                    ]);
          }
          runtimeProcessRef.current = process;
          logEvent(shouldUseTailwindFallback ? "fallback Vite 프로세스 시작" : "npm run dev 프로세스 시작");
          void process.exit.then((exitCode) => {
            if (exitCode !== 0) {
              const message = `개발 서버 프로세스가 종료되었습니다. (exit: ${exitCode})`;
              setPreviewStatus("error");
              setRuntimeError(message);
              logEvent(message);
            }
          });

          const reader = process.output.getReader();
          const abortController = new AbortController();
          outputPumpAbortRef.current = abortController;
          void (async () => {
            while (true) {
              if (abortController.signal.aborted) return;
              const { done, value } = await reader.read();
              if (done) return;
              if (!value) continue;
              value
                .split("\n")
                .filter((line) => line.trim())
                .forEach((line) => appendRuntimeLog(line));
            }
          })();
          if (serverReadyTimeoutRef.current) {
            window.clearTimeout(serverReadyTimeoutRef.current);
          }
          serverReadyTimeoutRef.current = window.setTimeout(() => {
            if (!previewReadyRef.current) {
              logEvent(
                `server-ready 이벤트가 ${SERVER_READY_TIMEOUT_MS / 1000}초 내 오지 않았습니다. dev server 로그를 확인해 주세요.`,
              );
            }
            serverReadyTimeoutRef.current = null;
          }, SERVER_READY_TIMEOUT_MS);
          return;
        }

        throw new Error("package.json에 dev 스크립트가 없어 프리뷰를 실행할 수 없습니다.");
      }

      appendRuntimeLog("정적 프리뷰 서버 실행 중...");
      await container.fs.writeFile(".cursor-preview-static-server.mjs", createStaticServerScript());
      const process = await container.spawn("node", [".cursor-preview-static-server.mjs"], {
        env: {
          PORT: String(PREVIEW_PORT),
        },
      });
      runtimeProcessRef.current = process;
      logEvent("정적 서버 프로세스 시작");
      void process.exit.then((exitCode) => {
        if (exitCode !== 0) {
          const message = `정적 서버 프로세스가 종료되었습니다. (exit: ${exitCode})`;
          setPreviewStatus("error");
          setRuntimeError(message);
          logEvent(message);
        }
      });
      const reader = process.output.getReader();
      const abortController = new AbortController();
      outputPumpAbortRef.current = abortController;
      void (async () => {
        while (true) {
          if (abortController.signal.aborted) return;
          const { done, value } = await reader.read();
          if (done) return;
          if (!value) continue;
          value
            .split("\n")
            .filter((line) => line.trim())
            .forEach((line) => {
              appendRuntimeLog(line);
              if (line.includes("STATIC_SERVER_READY")) {
                setPreviewUrl(`http://127.0.0.1:${PREVIEW_PORT}`);
                setPreviewStatus("ready");
              }
            });
        }
      })();
    },
    [appendRuntimeLog, logEvent, runCommand, stopRuntimeProcess],
  );

  const loadSingleFile = useCallback(
    async (path: string) => {
      if (!repositoryUrl) return;
      if (filesByPath[path]) return;

      const response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
      setFilesByPath((prev) => ({
        ...prev,
        [path]: {
          path,
          content: response.content,
          dirty: false,
        },
      }));
      const container = webContainerRef.current;
      if (container) {
        await container.fs.writeFile(path, response.content);
      }
      logEvent(`지연 로드 완료: ${path}`);
    },
    [filesByPath, logEvent, repositoryUrl],
  );

  const handleFileClick = useCallback(
    async (path: string) => {
      if (!openPaths.includes(path)) {
        setOpenPaths((prev) => [...prev, path]);
      }
      setActivePath(path);
      if (!filesByPath[path]) {
        try {
          await loadSingleFile(path);
        } catch (error) {
          setLoadError(`파일을 불러오지 못했습니다: ${toDisplayError(error)}`);
        }
      }
    },
    [filesByPath, loadSingleFile, openPaths],
  );

  const closeTab = useCallback((path: string) => {
    setOpenPaths((prev) => {
      const next = prev.filter((item) => item !== path);
      setActivePath((currentActive) => {
        if (currentActive !== path) return currentActive;
        if (!next.length) return null;
        return next[next.length - 1];
      });
      return next;
    });
  }, []);

  const handleEditorChange = useCallback(
    (nextValue: string | undefined) => {
      if (!activePath || nextValue === undefined) return;

      setFilesByPath((prev) => {
        const currentFile = prev[activePath];
        if (!currentFile) return prev;
        if (currentFile.content === nextValue) return prev;
        return {
          ...prev,
          [activePath]: {
            ...currentFile,
            content: nextValue,
            dirty: true,
          },
        };
      });

      const currentTimer = pendingWriteTimersRef.current.get(activePath);
      if (currentTimer) {
        window.clearTimeout(currentTimer);
      }

      const timerId = window.setTimeout(async () => {
        const container = webContainerRef.current;
        if (!container) return;

        try {
          await container.fs.writeFile(activePath, nextValue);
        } catch (error) {
          setRuntimeError(`실시간 반영 중 오류가 발생했습니다: ${toDisplayError(error)}`);
        }
      }, 220);

      pendingWriteTimersRef.current.set(activePath, timerId);
    },
    [activePath],
  );

  const handleRestartPreview = useCallback(async () => {
    if (!Object.keys(filesByPath).length) return;
    setIsRestarting(true);
    setRuntimeError(null);
    try {
      await startRuntime(filesByPath);
    } catch (error) {
      setPreviewStatus("error");
      setRuntimeError(toDisplayError(error));
    } finally {
      setIsRestarting(false);
    }
  }, [filesByPath, startRuntime]);

  useEffect(() => {
    if (!repositoryUrl) {
      setLoadError("저장소 URL이 없어 연결 페이지로 돌아갑니다.");
      return;
    }

    const loadWorkspace = async () => {
      setLoadingMessage("저장소 트리를 불러오는 중...");
      const sessionId = Date.now();
      loadSessionIdRef.current = sessionId;
      logEvent(`워크스페이스 로드 시작: ${repositoryUrl}`);
      setDiagnostics({
        treeMs: null,
        coreMs: null,
        runtimeMs: null,
        backgroundMs: null,
        coreFailedPaths: [],
        backgroundFailedPaths: [],
        lastError: null,
      });

      try {
        logEvent("WebContainer 사전 부팅 시작");
        const bootPromise = acquireWebContainer();
        const treeStart = Date.now();
        const treeResponse = await repositoryApi.getTree(repositoryUrl);
        setTree(treeResponse);
        const treeMs = Date.now() - treeStart;
        logEvent(`저장소 트리 로드 완료 (${formatDuration(treeMs)})`);
        setDiagnostics((prev) => ({ ...prev, treeMs }));

        setLoadingMessage("프리뷰용 핵심 파일을 불러오는 중...");
        const coreStart = Date.now();
        const loaded = await loadRepositoryFiles(repositoryUrl, treeResponse, {
          onProgress: (done, total) => {
            if (done === total || done % BATCH_SIZE === 0) {
              logEvent(`핵심 파일 로딩 진행률: ${done}/${total}`);
            }
          },
          onFileFailed: (path, reason) => {
            logEvent(`핵심 파일 로드 실패: ${path} (${reason})`);
          },
        });
        if (loadSessionIdRef.current !== sessionId) return;
        const coreMs = Date.now() - coreStart;
        logEvent(
          `핵심 파일 로드 완료 (${formatDuration(coreMs)}), 성공 ${Object.keys(loaded.files).length}개, 실패 ${loaded.coreFailedPaths.length}개`,
        );
        if (loaded.skippedLargePaths.length > 0) {
          logEvent(
            `대용량 파일 ${loaded.skippedLargePaths.length}개는 초기 프리뷰에서 제외 (>${Math.floor(MAX_PREVIEW_FILE_BYTES / 1024)}KB)`,
          );
        }
        setFilesByPath(loaded.files);
        setTruncatedCount(loaded.truncatedCount);
        const loadableCorePaths = loaded.corePaths.filter((path) => Boolean(loaded.files[path]));
        const nextActive = selectInitialActivePath(loadableCorePaths);
        if (nextActive) {
          setOpenPaths([nextActive]);
          setActivePath(nextActive);
        }
        setDiagnostics((prev) => ({
          ...prev,
          coreMs,
          coreFailedPaths: loaded.coreFailedPaths,
        }));

        setLoadingMessage("프리뷰 런타임을 준비하는 중...");
        const runtimeStart = Date.now();
        logEvent("WebContainer 부팅 완료 대기 중...");
        await bootPromise;
        logEvent("WebContainer 부팅 완료");
        await startRuntime(loaded.files);
        const runtimeMs = Date.now() - runtimeStart;
        logEvent(`프리뷰 런타임 준비 완료 (${formatDuration(runtimeMs)})`);
        setDiagnostics((prev) => ({ ...prev, runtimeMs }));

        if (loaded.deferredPaths.length > 0) {
          setIsBackgroundLoading(true);
          setLoadingMessage("나머지 파일을 백그라운드에서 불러오는 중...");
          const backgroundFailedPaths: string[] = [];
          const bgStart = Date.now();
          await runBatched(
            loaded.deferredPaths,
            async (path) => {
              if (loadSessionIdRef.current !== sessionId) return;
              let response;
              try {
                response = await fetchRepositoryFileWithTimeout(repositoryUrl, path);
              } catch (error) {
                backgroundFailedPaths.push(path);
                logEvent(`백그라운드 파일 로드 실패: ${path} (${toDisplayError(error)})`);
                return;
              }
              setFilesByPath((prev) => {
                const existing = prev[path];
                if (existing?.dirty) return prev;
                if (existing && existing.content === response.content) return prev;
                return {
                  ...prev,
                  [path]: {
                    path,
                    content: response.content,
                    dirty: existing?.dirty ?? false,
                  },
                };
              });

              const container = webContainerRef.current;
              if (container) {
                await container.fs.writeFile(path, response.content);
              }
            },
            BATCH_SIZE,
          );
          if (loadSessionIdRef.current === sessionId) {
            const backgroundMs = Date.now() - bgStart;
            logEvent(
              `백그라운드 로드 완료 (${formatDuration(backgroundMs)}), 실패 ${backgroundFailedPaths.length}개`,
            );
            setIsBackgroundLoading(false);
            setDiagnostics((prev) => ({
              ...prev,
              backgroundMs,
              backgroundFailedPaths,
            }));
          }
        }
      } catch (error) {
        setIsBackgroundLoading(false);
        const errorMessage = toDisplayError(error);
        logEvent(`워크스페이스 로드 실패: ${errorMessage}`);
        setLoadError(errorMessage);
        setDiagnostics((prev) => ({ ...prev, lastError: errorMessage }));
      }
    };

    void loadWorkspace();
    return () => {
      loadSessionIdRef.current = 0;
    };
  }, [repositoryUrl, startRuntime]);

  useEffect(() => {
    const pendingTimers = pendingWriteTimersRef.current;
    return () => {
      loadSessionIdRef.current = 0;
      previewReadyRef.current = false;
      if (serverReadyTimeoutRef.current) {
        window.clearTimeout(serverReadyTimeoutRef.current);
        serverReadyTimeoutRef.current = null;
      }
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.clear();
      void stopRuntimeProcess();
    };
  }, [stopRuntimeProcess]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">레포지토리 워크스페이스</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {tree ? `${tree.owner}/${tree.repo}` : repositoryUrl}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isRestarting ? "disabled" : "blue"}
            disabled={isRestarting || !Object.keys(filesByPath).length}
            onClick={() => {
              void handleRestartPreview();
            }}
            className="h-11 rounded-none px-5 text-sm"
          >
            {isRestarting ? "재시작 중..." : "프리뷰 재시작"}
          </Button>
          <Button
            variant="default"
            onClick={() => navigate("/repository-connect")}
            className="h-11 rounded-none px-5 text-sm"
          >
            다른 저장소 선택
          </Button>
        </div>
      </header>

      {loadError && (
        <section className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <p>{loadError}</p>
          <p className="mt-2">잠시 후 다시 시도해 주세요.</p>
        </section>
      )}

      {!loadError && !Object.keys(filesByPath).length && (
        <section className="mb-4 border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          {loadingMessage}
        </section>
      )}

      {truncatedCount > 0 && (
        <section className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          파일 수가 많아 처음 {MAX_INITIAL_FILES}개만 로드했습니다. 필요한 파일은 클릭 시 추가 로드됩니다.
          (생략: {truncatedCount}개)
        </section>
      )}

      {isBackgroundLoading && (
        <section className="mb-4 border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
          프리뷰는 먼저 시작했고, 나머지 파일은 백그라운드로 동기화 중입니다.
        </section>
      )}

      <section className="mb-4 border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">진단 로그 요약</p>
        <p className="mt-1">
          트리: {formatDuration(diagnostics.treeMs)} / 핵심 파일: {formatDuration(diagnostics.coreMs)} / 런타임:{" "}
          {formatDuration(diagnostics.runtimeMs)} / 백그라운드: {formatDuration(diagnostics.backgroundMs)}
        </p>
        <p>
          핵심 로드 실패: {diagnostics.coreFailedPaths.length}개 / 백그라운드 로드 실패:{" "}
          {diagnostics.backgroundFailedPaths.length}개
        </p>
        {diagnostics.lastError && <p className="text-rose-600">마지막 오류: {diagnostics.lastError}</p>}
      </section>

      <section className="grid min-h-[calc(100svh-10rem)] grid-cols-12 gap-3">
        <aside className="col-span-3 overflow-auto border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-2 text-sm font-bold text-slate-800">
            파일 트리 ({Object.keys(filesByPath).length})
          </div>
          <div className="p-2">
            {treeItems.map((item) => (
              <TreeNodeItem
                key={item.path}
                item={item}
                activePath={activePath}
                onFileClick={handleFileClick}
              />
            ))}
          </div>
        </aside>

        <div className="col-span-5 flex min-h-0 flex-col border border-slate-200 bg-white">
          <div className="flex min-h-11 items-stretch overflow-x-auto border-b border-slate-200">
            {openPaths.length === 0 && (
              <span className="px-3 py-2 text-sm font-medium text-slate-400">열린 파일이 없습니다.</span>
            )}
            {openPaths.map((path) => {
              const file = filesByPath[path];
              const isActive = activePath === path;
              const dirty = file?.dirty ?? false;
              return (
                <button
                  key={path}
                  type="button"
                  className={[
                    "flex items-center gap-2 border-r border-slate-200 px-3 text-xs font-semibold",
                    isActive ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500 hover:bg-slate-50",
                  ].join(" ")}
                  onClick={() => {
                    void handleFileClick(path);
                  }}
                >
                  <span>{path.split("/").pop()}</span>
                  {dirty && <span className="text-sky-600">*</span>}
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-slate-400 hover:text-slate-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeTab(path);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        closeTab(path);
                      }
                    }}
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1">
            {activeFile ? (
              <Editor
                key={activeFile.path}
                language={inferLanguage(activeFile.path)}
                value={activeFile.content}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                파일을 선택해 주세요.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 flex min-h-0 flex-col border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <strong className="text-sm text-slate-800">실시간 프리뷰</strong>
            <span
              className={[
                "text-xs font-bold",
                previewStatus === "ready"
                  ? "text-green-600"
                  : previewStatus === "error"
                    ? "text-rose-600"
                    : "text-slate-500",
              ].join(" ")}
            >
              {previewStatus === "ready"
                ? "연결됨"
                : previewStatus === "loading"
                  ? "준비 중"
                  : previewStatus === "error"
                    ? "오류"
                    : "대기"}
            </span>
          </div>

          <div className="min-h-0 flex-1 bg-slate-100">
            {previewUrl && previewStatus === "ready" ? (
              <iframe
                title="repository-preview"
                src={previewUrl}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-slate-500">
                {runtimeError ?? "프리뷰를 준비하고 있습니다."}
              </div>
            )}
          </div>

          <div className="h-28 overflow-auto border-t border-slate-200 bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-200">
            {runtimeLog.length === 0
              ? "로그가 없습니다."
              : runtimeLog.slice(-40).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          </div>
        </div>
      </section>
    </main>
  );
}

interface TreeNodeItemProps {
  item: TreeItem;
  activePath: string | null;
  onFileClick: (path: string) => void | Promise<void>;
  depth?: number;
}

function TreeNodeItem({ item, activePath, onFileClick, depth = 0 }: TreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const padding = `${depth * 12 + 8}px`;

  if (item.type === "blob") {
    return (
      <button
        type="button"
        className={[
          "flex w-full items-center rounded px-2 py-1 text-left text-xs font-medium",
          activePath === item.path
            ? "bg-sky-100 text-sky-700"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
        ].join(" ")}
        style={{ paddingLeft: padding }}
        onClick={() => {
          void onFileClick(item.path);
        }}
      >
        {item.name}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center rounded px-2 py-1 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100"
        style={{ paddingLeft: padding }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="mr-1 text-[10px]">{isOpen ? "▼" : "▶"}</span>
        {item.name}
      </button>
      {isOpen &&
        item.children.map((child) => (
          <TreeNodeItem key={child.path} item={child} activePath={activePath} onFileClick={onFileClick} depth={depth + 1} />
        ))}
    </div>
  );
}
