const SNAPSHOT_LOG_PREFIX = "[렌더링 스냅샷]";

export function snapshotLog(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`${SNAPSHOT_LOG_PREFIX} ${message}`, detail);
  } else {
    console.log(`${SNAPSHOT_LOG_PREFIX} ${message}`);
  }
}

export function snapshotWarn(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.warn(`${SNAPSHOT_LOG_PREFIX} ${message}`, detail);
  } else {
    console.warn(`${SNAPSHOT_LOG_PREFIX} ${message}`);
  }
}

export function snapshotError(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.error(`${SNAPSHOT_LOG_PREFIX} ${message}`, detail);
  } else {
    console.error(`${SNAPSHOT_LOG_PREFIX} ${message}`);
  }
}
