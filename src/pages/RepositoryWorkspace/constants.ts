export const MAX_INITIAL_FILES = 180;
export const BATCH_SIZE = 10;
export const FILE_FETCH_TIMEOUT_MS = 15000;
export const MAX_PREVIEW_FILE_BYTES = 500 * 1024;
export const PREVIEW_PORT = 4173;
export const SERVER_READY_TIMEOUT_MS = 30000;

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
