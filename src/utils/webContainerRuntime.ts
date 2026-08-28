import { WebContainer } from "@webcontainer/api";
import { resetWebContainerFilesystemState } from "./webContainerFilesystem";

const DEFAULT_BOOT_TIMEOUT_MS = 12000;

let sharedWebContainer: WebContainer | null = null;
let sharedWebContainerPromise: Promise<WebContainer> | null = null;
let lifecycleChain: Promise<unknown> = Promise.resolve();

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

function enqueueLifecycleTask<T>(task: () => Promise<T>): Promise<T> {
  const next = lifecycleChain.then(task, task);
  lifecycleChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function bootSharedWebContainer(): Promise<WebContainer> {
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
        resetWebContainerFilesystemState();
        throw error;
      });
  }

  return sharedWebContainerPromise;
}

export function getActiveWebContainer(): WebContainer | null {
  return sharedWebContainer;
}

export async function teardownWebContainer(): Promise<void> {
  await enqueueLifecycleTask(async () => {
    const instance = sharedWebContainer;
    sharedWebContainer = null;
    sharedWebContainerPromise = null;
    resetWebContainerFilesystemState();

    if (!instance) return;

    try {
      instance.teardown();
    } catch (error) {
      console.warn("[WebContainer] teardown 실패:", error);
    }
  });
}

export async function acquireWebContainer(
  timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS,
): Promise<WebContainer> {
  return enqueueLifecycleTask(async () => {
    try {
      return await withTimeout(
        bootSharedWebContainer(),
        timeoutMs,
        `WebContainer 부팅 타임아웃(${timeoutMs}ms)`,
      );
    } catch (error) {
      if (!sharedWebContainer) {
        sharedWebContainerPromise = null;
        resetWebContainerFilesystemState();
      }
      throw error;
    }
  });
}

export async function restartWebContainer(
  timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS,
): Promise<WebContainer> {
  await teardownWebContainer();
  return acquireWebContainer(timeoutMs);
}

export async function prewarmWebContainer(
  timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS,
): Promise<void> {
  await acquireWebContainer(timeoutMs);
}
