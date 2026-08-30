import { WebContainer } from "@webcontainer/api";
import {
  isWebContainerFilesystemMounted,
  resetWebContainerFilesystemState,
} from "./webContainerFilesystem";

/** First production boot downloads the WASM runtime; 12s is too short and caused a second boot(). */
const DEFAULT_BOOT_TIMEOUT_MS = 60_000;

/** `teardown()` returns void and stashes its async work on this internal static. */
interface WebContainerInternals {
  _teardownPromise?: Promise<void> | null;
}

const INSTANCE_LIMIT_PATTERN = /more instances|single WebContainer instance|already booted/i;

export const WEBCONTAINER_INSTANCE_LIMIT_MESSAGE =
  "브라우저에서 사용할 수 있는 프리뷰 인스턴스가 이미 점유되어 있습니다. 이 사이트를 열어 둔 다른 탭을 모두 닫고 새로고침한 뒤 다시 시도해 주세요.";

export const WEBCONTAINER_ISOLATION_MESSAGE =
  "이 페이지가 교차 출처 격리(COOP/COEP) 상태로 제공되지 않아 프리뷰 런타임을 시작할 수 없습니다. 배포 설정에서 Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp 헤더가 실제로 내려오는지 확인해 주세요.";

export function isWebContainerInstanceLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return INSTANCE_LIMIT_PATTERN.test(message);
}

function isBootTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("WebContainer 부팅 타임아웃");
}

export function assertWebContainerEnvironment(): void {
  if (typeof window === "undefined") {
    throw new Error("WebContainer는 브라우저에서만 사용할 수 있습니다.");
  }
  if (!window.crossOriginIsolated) {
    throw new Error(WEBCONTAINER_ISOLATION_MESSAGE);
  }
}

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
    assertWebContainerEnvironment();
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

    const internals = WebContainer as unknown as WebContainerInternals;
    try {
      instance.teardown();
      await internals._teardownPromise;
    } catch (error) {
      console.warn("[WebContainer] teardown 실패:", error);
    } finally {
      // Already awaited here; leaving a settled (possibly rejected) promise
      // behind would make the next boot() reject on it.
      internals._teardownPromise = null;
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
      // A timed-out wait must not drop the in-flight boot(). StackBlitz still
      // occupies the single instance slot, so a second boot() becomes
      // "Unable to create more instances".
      if (!isBootTimeoutError(error) && !sharedWebContainer) {
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

/**
 * Returns a container with an empty filesystem, reusing an already-booted one when
 * nothing has been mounted into it yet. Every boot consumes a WebContainer instance
 * slot, so an unconditional teardown/boot cycle doubles the chance of hitting the
 * runtime's concurrent instance limit.
 */
export async function acquireCleanWebContainer(
  timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS,
  retries: number = 2,
): Promise<WebContainer> {
  if (sharedWebContainer && isWebContainerFilesystemMounted()) {
    await teardownWebContainer();
  }

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await acquireWebContainer(timeoutMs);
    } catch (error) {
      if (attempt >= retries || !isWebContainerInstanceLimitError(error)) {
        throw error;
      }
      console.warn(
        `[WebContainer] 인스턴스 한도로 부팅 실패 — 재시도 ${attempt + 1}/${retries}`,
        error,
      );
      await teardownWebContainer();
      await new Promise((resolve) => window.setTimeout(resolve, 3000 * (attempt + 1)));
    }
  }
}

export async function prewarmWebContainer(
  timeoutMs: number = DEFAULT_BOOT_TIMEOUT_MS,
): Promise<void> {
  await acquireWebContainer(timeoutMs);
}
