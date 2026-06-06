import { WebContainer } from "@webcontainer/api";

const DEFAULT_BOOT_TIMEOUT_MS = 12000;

let sharedWebContainer: WebContainer | null = null;
let sharedWebContainerPromise: Promise<WebContainer> | null = null;

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

export async function acquireWebContainer(timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS): Promise<WebContainer> {
  try {
    return await withTimeout(
      getSharedWebContainer(),
      timeoutMs,
      `WebContainer 부팅 타임아웃(${timeoutMs}ms)`,
    );
  } catch (error) {
    if (!sharedWebContainer) {
      sharedWebContainerPromise = null;
    }
    throw error;
  }
}

export async function prewarmWebContainer(timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS): Promise<void> {
  await acquireWebContainer(timeoutMs);
}
