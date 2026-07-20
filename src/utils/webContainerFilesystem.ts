import type { FileSystemTree, WebContainer } from "@webcontainer/api";

export type WorkspaceFileContent = string | Uint8Array;

const MOUNT_TIMEOUT_MS = 120_000;

let mountState: "idle" | "mounted" = "idle";
let mountTask: Promise<void> | null = null;

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

export function decodeBase64FileContent(content: string): Uint8Array {
  const binary = window.atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function resetWebContainerFilesystemState(): void {
  mountState = "idle";
  mountTask = null;
}

export function isWebContainerFilesystemMounted(): boolean {
  return mountState === "mounted";
}

function getParentDirectory(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

export async function writeWorkspaceFile(
  container: WebContainer,
  path: string,
  content: WorkspaceFileContent,
): Promise<void> {
  const parent = getParentDirectory(path);
  if (parent) {
    await container.fs.mkdir(parent, { recursive: true });
  }
  await container.fs.writeFile(path, content);
}

async function mountTree(container: WebContainer, fsTree: FileSystemTree): Promise<void> {
  if (mountState === "mounted") return;

  mountTask ??= withTimeout(
    container.mount(fsTree),
    MOUNT_TIMEOUT_MS,
    `WebContainer 파일 마운트 타임아웃(${MOUNT_TIMEOUT_MS / 1000}초). 프리뷰 재시작을 시도해 주세요.`,
  )
    .then(() => {
      mountState = "mounted";
    })
    .catch((error) => {
      mountTask = null;
      throw error;
    });

  await mountTask;
}

export async function syncWorkspaceFiles(
  container: WebContainer,
  files: Record<string, WorkspaceFileContent>,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await writeWorkspaceFile(container, path, content);
  }
}

export async function mountOrSyncWorkspace(
  container: WebContainer,
  fsTree: FileSystemTree,
  files: Record<string, WorkspaceFileContent>,
): Promise<"mounted" | "synced"> {
  if (mountState === "mounted") {
    await syncWorkspaceFiles(container, files);
    return "synced";
  }

  await mountTree(container, fsTree);
  return "mounted";
}