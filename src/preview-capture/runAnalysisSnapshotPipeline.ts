import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { uploadWcagAnalysis } from "@/api/analysis";
import type { RepositoryTreeResponse } from "@/api/repository";
import { resolvePreviewProject, type PreviewProjectProfile } from "@/pages/RepositoryWorkspace/previewProject";
import {
  BUNDLER_SERVER_READY_TIMEOUT_MS,
  NPM_INSTALL_TIMEOUT_MS,
  PREVIEW_PORT,
  SERVER_READY_TIMEOUT_MS,
} from "@/pages/RepositoryWorkspace/constants";
import type { LoadedFile } from "@/pages/RepositoryWorkspace/types";
import {
  buildFileSystemTree,
  createStaticServerScript,
  findPreviewEntryPath,
  withTimeout,
} from "@/pages/RepositoryWorkspace/utils";
import { acquireWebContainer, teardownWebContainer } from "@/utils/webContainerRuntime";
import {
  mountOrSyncWorkspace,
  writeWorkspaceBinaryFile,
  writeWorkspaceFile,
} from "@/utils/webContainerFilesystem";
import { buildSnapshotMeta } from "./buildSnapshotMeta";
import { capturePreviewSnapshot } from "./capturePreviewSnapshot";
import { ensureStaticPreviewAssets } from "./ensureStaticPreviewAssets";
import { injectCaptureAssets } from "./injectCaptureAssets";

export interface AnalysisSnapshotPipelineResult {
  resultId: number;
  snapshotId: string;
  previewUrl: string;
  imageBlob: Blob;
  imageObjectUrl: string;
  renderedFilePaths: string[];
  previewEntryPath: string | null;
}

export interface AnalysisSnapshotPipelineOptions {
  repositoryUrl: string;
  branchName: string;
  tree: RepositoryTreeResponse;
  files: Record<string, { path: string; content: string }>;
  onProgress?: (message: string) => void;
}

function toLoadedFiles(
  files: Record<string, { path: string; content: string }>,
): Record<string, LoadedFile> {
  return Object.fromEntries(
    Object.entries(files).map(([path, file]) => [
      path,
      {
        path: file.path,
        content: file.content,
        dirty: false,
      },
    ]),
  );
}

function waitForServerReady(container: WebContainer, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`server-ready 이벤트가 ${timeoutMs / 1000}초 내 오지 않았습니다.`));
    }, timeoutMs);

    container.on("server-ready", (_port, url) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(url.endsWith("/") ? url : `${url}/`);
    });
  });
}

async function startStaticPreview(
  container: WebContainer,
  files: Record<string, LoadedFile>,
  onProgress?: (message: string) => void,
): Promise<string | null> {
  const entryPath = findPreviewEntryPath(files);
  if (!entryPath) {
    throw new Error("프리뷰할 HTML 파일을 찾을 수 없습니다. index.html이 포함된 저장소인지 확인해 주세요.");
  }

  if (entryPath !== "index.html" && entryPath !== "index.htm") {
    await writeWorkspaceFile(container, "index.html", files[entryPath].content);
  }

  onProgress?.("정적 프리뷰 서버 실행 중…");
  await writeWorkspaceFile(container, ".cursor-preview-static-server.mjs", createStaticServerScript());
  await container.spawn("node", [".cursor-preview-static-server.mjs"], {
    env: { PORT: String(PREVIEW_PORT) },
  });

  return entryPath;
}

async function startBundlerPreview(
  container: WebContainer,
  profile: PreviewProjectProfile,
  onProgress?: (message: string) => void,
): Promise<WebContainerProcess> {
  const installEnv = {
    CI: "true",
    NPM_CONFIG_PROGRESS: "false",
    PNPM_IGNORE_ENGINES: "true",
  };

  let installSucceeded = false;
  for (const installCommand of profile.installCommands) {
    onProgress?.(`의존성 설치 중 (${installCommand.join(" ")})…`);
    const installProcess = await container.spawn(installCommand[0], installCommand.slice(1), {
      env: installEnv,
    });
    const installExitCode = await withTimeout(
      installProcess.exit,
      NPM_INSTALL_TIMEOUT_MS,
      `의존성 설치 타임아웃(${NPM_INSTALL_TIMEOUT_MS / 60000}분)`,
    );
    if (installExitCode === 0) {
      installSucceeded = true;
      break;
    }
  }

  if (!installSucceeded) {
    throw new Error("의존성 설치에 실패했습니다.");
  }

  const devCwd = profile.workspaceRoot || undefined;
  const devCommands = [profile.devCommand, ...profile.devCommandFallbacks];
  let lastError: Error | null = null;

  for (const devCommand of devCommands) {
    onProgress?.(`개발 서버 실행 중 (${devCommand.join(" ")})…`);
    const process = await container.spawn(devCommand[0], devCommand.slice(1), {
      cwd: devCwd,
      env: { CI: "true", ...profile.devEnv },
    });

    const earlyExit = await Promise.race([
      process.exit.then((code) => ({ type: "exit" as const, code })),
      new Promise<{ type: "timeout" }>((resolve) => {
        window.setTimeout(() => resolve({ type: "timeout" }), 8000);
      }),
    ]);

    if (earlyExit.type === "timeout") {
      return process;
    }

    if (earlyExit.code === 0 || earlyExit.code === 143 || earlyExit.code === 137) {
      return process;
    }

    lastError = new Error(`개발 서버 시작 실패 (exit: ${earlyExit.code})`);
  }

  throw lastError ?? new Error("개발 서버를 시작하지 못했습니다.");
}

export async function runAnalysisSnapshotPipeline(
  options: AnalysisSnapshotPipelineOptions,
): Promise<AnalysisSnapshotPipelineResult> {
  const { repositoryUrl, branchName, tree, onProgress } = options;

  if (Object.keys(options.files).length === 0) {
    throw new Error("분석할 저장소 파일이 없습니다.");
  }

  onProgress?.("WebContainer 준비 중…");
  await teardownWebContainer();
  const container = await acquireWebContainer();

  let textFiles = options.files;
  let binaryFiles: Record<string, Uint8Array> = {};

  const provisionalProfile = resolvePreviewProject(toLoadedFiles(textFiles));
  if (provisionalProfile.kind === "static") {
    onProgress?.("CSS/이미지 자산 로드 중…");
    const ensured = await ensureStaticPreviewAssets({
      repositoryUrl,
      branchName,
      tree,
      files: textFiles,
    });
    textFiles = ensured.textFiles;
    binaryFiles = ensured.binaryFiles;
  }

  const files = toLoadedFiles(textFiles);
  const projectProfile = resolvePreviewProject(files);
  const isBundler = projectProfile.kind === "bundler";

  onProgress?.("파일 시스템 마운트 중…");
  const fsTree = buildFileSystemTree(files);
  const flatFiles = Object.fromEntries(Object.entries(files).map(([path, file]) => [path, file.content]));
  await mountOrSyncWorkspace(container, fsTree, flatFiles);

  // Remount-safe: explicitly rewrite all text/binary assets after mount.
  for (const [path, file] of Object.entries(files)) {
    await writeWorkspaceFile(container, path, file.content);
  }
  for (const [path, bytes] of Object.entries(binaryFiles)) {
    await writeWorkspaceBinaryFile(container, path, bytes);
  }

  try {
    const rootEntries = await container.fs.readdir(".");
    onProgress?.(`마운트 확인: ${rootEntries.slice(0, 12).join(", ")}`);
    if (rootEntries.includes("styles")) {
      const styleEntries = await container.fs.readdir("styles");
      onProgress?.(`styles/ 확인: ${styleEntries.join(", ")}`);
    }
  } catch (error) {
    console.warn("[runAnalysisSnapshotPipeline] readdir failed:", error);
  }

  onProgress?.("캡처 호스트 주입 중…");
  await injectCaptureAssets(container, projectProfile);

  const readyPromise = waitForServerReady(
    container,
    isBundler ? BUNDLER_SERVER_READY_TIMEOUT_MS : SERVER_READY_TIMEOUT_MS,
  );

  let previewEntryPath: string | null = null;
  if (isBundler) {
    await startBundlerPreview(container, projectProfile, onProgress);
  } else {
    previewEntryPath = await startStaticPreview(container, files, onProgress);
  }

  onProgress?.("프리뷰 서버 준비 대기 중…");
  const previewUrl = await readyPromise;

  onProgress?.("렌더링 스냅샷 캡처 중…");
  const captured = await capturePreviewSnapshot({
    previewUrl,
    mode: isBundler ? "host" : "direct",
    // CSS/이미지 적용 대기
    waitMs: isBundler ? 1200 : 1000,
    timeoutMs: 25_000,
  });
  const snapshotId = `snap-${Date.now()}`;
  const renderedFilePaths = buildSnapshotMeta(files, previewEntryPath);
  const imageObjectUrl = URL.createObjectURL(captured.blob);

  onProgress?.("스냅샷을 백엔드로 전송 중…");
  const resultId = await uploadWcagAnalysis({
    repositoryUrl,
    branchName,
    snapshots: [
      {
        snapshotId,
        image: captured.blob,
        renderedFilePaths,
      },
    ],
  });

  return {
    resultId,
    snapshotId,
    previewUrl,
    imageBlob: captured.blob,
    imageObjectUrl,
    renderedFilePaths,
    previewEntryPath,
  };
}
