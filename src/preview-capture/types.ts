export interface CapturedPreviewSnapshot {
  blob: Blob;
  width: number;
  height: number;
}

export interface CapturePreviewSnapshotOptions {
  previewUrl: string;
  targetPath?: string;
  waitMs?: number;
  timeoutMs?: number;
  /**
   * direct: load previewUrl (bridge already in HTML) — preferred for CRA/Vite/static
   * host: nested capture-host page (legacy fallback)
   */
  mode?: "direct" | "host";
  /** host mode only: file path vs hash takeover */
  hostStrategy?: "file" | "hash";
}

export type SnapshotCaptureStatus = "idle" | "capturing" | "uploading" | "done" | "error";
