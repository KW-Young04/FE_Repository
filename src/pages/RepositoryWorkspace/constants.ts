export const MAX_INITIAL_FILES = 180;
export const BATCH_SIZE = 10;
export const PRELOAD_BATCH_SIZE = 4;
export const FILE_FETCH_TIMEOUT_MS = 15000;
export const MAX_PREVIEW_FILE_BYTES = 500 * 1024;
export const PREVIEW_PORT = 4173;
export const SERVER_READY_TIMEOUT_MS = 30000;
export const BUNDLER_SERVER_READY_TIMEOUT_MS = 180000;
export const NPM_INSTALL_TIMEOUT_MS = 600000;
export const PREVIEW_SYNC_DEBOUNCE_MS = 300;

export const PREVIEW_AFFECTING_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
]);

export const BUNDLER_CONFIG_PATHS = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
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

export const EDITOR_LANGUAGE_BY_EXT: Record<string, string> = {
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
