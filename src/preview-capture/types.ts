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
  /** static HTML: inject bridge into page. bundler: nested capture-host */
  mode?: "direct" | "host";
}

export type SnapshotCaptureStatus = "idle" | "capturing" | "uploading" | "done" | "error";
