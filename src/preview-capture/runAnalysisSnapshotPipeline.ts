import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { uploadWcagAnalysis } from "@/api/analysis";
import type { RepositoryTreeResponse } from "@/api/repository";
import { resolvePreviewProject, explainUnsupportedPreviewRepo, type PreviewProjectProfile } from "@/pages/RepositoryWorkspace/previewProject";
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
  ensurePreviewFilesLoaded,
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
import { snapshotError, snapshotLog, snapshotWarn } from "./snapshotLogger";

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

function reportProgress(onProgress: ((message: string) => void) | undefined, message: string, detail?: unknown) {
  snapshotLog(message, detail);
  onProgress?.(message);
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
  snapshotLog("정적 프리뷰 서버 스크립트 작성 및 실행", { entryPath, port: PREVIEW_PORT });
  await writeWorkspaceFile(container, ".cursor-preview-static-server.mjs", createStaticServerScript());
  await container.spawn("node", [".cursor-preview-static-server.mjs"], {
    env: { PORT: String(PREVIEW_PORT) },
  });
  snapshotLog("정적 프리뷰 서버 프로세스 시작됨");

  return entryPath;
}

async function collectProcessOutput(process: WebContainerProcess, maxChars = 4000): Promise<string> {
  const reader = process.output.getReader();
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      text += value;
      if (text.length > maxChars) {
        text = text.slice(text.length - maxChars);
      }
    }
  } catch {
    // ignore stream errors after process exit
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
  return text.trim();
}

function summarizeInstallLog(log: string): string {
  if (!log) return "";
  const lines = log
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const interesting = lines.filter((line) =>
    /err!|error|only-allow|ELIFECYCLE|ENOENT|ERESOLVE|unsupported|forbidden|preinstall/i.test(line),
  );
  const picked = (interesting.length > 0 ? interesting : lines).slice(-8);
  return picked.join(" | ");
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
  let lastInstallSummary = "";

  for (const installCommand of profile.installCommands) {
    onProgress?.(`의존성 설치 중 (${installCommand.join(" ")})…`);
    snapshotLog("의존성 설치 시작", { command: installCommand.join(" ") });
    const installStartedAt = Date.now();
    const installProcess = await container.spawn(installCommand[0], installCommand.slice(1), {
      env: installEnv,
    });
    const outputPromise = collectProcessOutput(installProcess);
    const installExitCode = await withTimeout(
      installProcess.exit,
      NPM_INSTALL_TIMEOUT_MS,
      `의존성 설치 타임아웃(${NPM_INSTALL_TIMEOUT_MS / 60000}분)`,
    );
    const installLog = await outputPromise;
    lastInstallSummary = summarizeInstallLog(installLog);
    snapshotLog("의존성 설치 종료", {
      command: installCommand.join(" "),
      exitCode: installExitCode,
      elapsedMs: Date.now() - installStartedAt,
      logTail: lastInstallSummary || undefined,
    });
    if (installExitCode === 0) {
      installSucceeded = true;
      break;
    }
    snapshotWarn("의존성 설치 커맨드 실패", {
      command: installCommand.join(" "),
      exitCode: installExitCode,
      logTail: lastInstallSummary || "(로그 없음)",
    });
  }

  if (!installSucceeded) {
    snapshotError("의존성 설치 실패 — 모든 설치 커맨드 실패", { logTail: lastInstallSummary });
    const detail = lastInstallSummary
      ? ` 원인 요약: ${lastInstallSummary}`
      : " (설치 로그가 비어 있습니다. pnpm 전용 모노레포이거나 WebContainer에서 지원되지 않는 저장소일 수 있습니다.)";
    throw new Error(`의존성 설치에 실패했습니다.${detail}`);
  }

  const devCwd = profile.workspaceRoot || undefined;
  const devCommands = [profile.devCommand, ...profile.devCommandFallbacks];
  let lastError: Error | null = null;

  for (const devCommand of devCommands) {
    onProgress?.(`개발 서버 실행 중 (${devCommand.join(" ")})…`);
    snapshotLog("개발 서버 시작 시도", { command: devCommand.join(" "), cwd: devCwd ?? "." });
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
      snapshotLog("개발 서버 프로세스 유지 중 (8초 내 종료 없음)");
      return process;
    }

    if (earlyExit.code === 0 || earlyExit.code === 143 || earlyExit.code === 137) {
      snapshotLog("개발 서버 프로세스 시작됨", { exitCode: earlyExit.code });
      return process;
    }

    snapshotWarn("개발 서버 시작 실패, 다음 커맨드 시도", {
      command: devCommand.join(" "),
      exitCode: earlyExit.code,
    });
    lastError = new Error(`개발 서버 시작 실패 (exit: ${earlyExit.code})`);
  }

  throw lastError ?? new Error("개발 서버를 시작하지 못했습니다.");
}

export async function runAnalysisSnapshotPipeline(
  options: AnalysisSnapshotPipelineOptions,
): Promise<AnalysisSnapshotPipelineResult> {
  const { repositoryUrl, branchName, tree, onProgress } = options;
  const pipelineStartedAt = Date.now();

  snapshotLog("파이프라인 시작", {
    repositoryUrl,
    branchName,
    fileCount: Object.keys(options.files).length,
    treeNodeCount: tree.nodes.length,
  });

  if (Object.keys(options.files).length === 0) {
    throw new Error("분석할 저장소 파일이 없습니다.");
  }

  reportProgress(onProgress, "WebContainer 준비 중…");
  await teardownWebContainer();
  const container = await acquireWebContainer();
  snapshotLog("WebContainer 확보 완료");

  let textFiles = options.files;
  let binaryFiles: Record<string, Uint8Array> = {};

  const provisionalProfile = resolvePreviewProject(toLoadedFiles(textFiles));
  snapshotLog("프로젝트 유형 판별", {
    kind: provisionalProfile.kind,
    label: provisionalProfile.label,
    workspaceRoot: provisionalProfile.workspaceRoot || "(root)",
  });

  const unsupported = explainUnsupportedPreviewRepo(toLoadedFiles(textFiles));
  if (unsupported) {
    snapshotError("프리뷰 비지원 저장소", { message: unsupported });
    throw new Error(unsupported);
  }

  if (provisionalProfile.kind === "static") {
    reportProgress(onProgress, "CSS/이미지 자산 로드 중…");
    const ensured = await ensureStaticPreviewAssets({
      repositoryUrl,
      branchName,
      tree,
      files: textFiles,
    });
    textFiles = ensured.textFiles;
    binaryFiles = ensured.binaryFiles;
    snapshotLog("정적 자산 로드 완료", {
      textFileCount: Object.keys(textFiles).length,
      binaryFileCount: Object.keys(binaryFiles).length,
      binaryPaths: Object.keys(binaryFiles),
    });
  }

  let files = toLoadedFiles(textFiles);
  const candidatePaths = tree.nodes
    .filter((node) => node.type === "blob")
    .map((node) => node.path);

  reportProgress(onProgress, "캡처용 HTML 엔트리 확인 중…");
  files = await ensurePreviewFilesLoaded(files, candidatePaths, repositoryUrl);
  snapshotLog("캡처용 HTML 엔트리 로드 후", {
    hasIndex: Boolean(files["index.html"] || files["index.htm"]),
    hasPublicIndex: Boolean(files["public/index.html"] || files["public/index.htm"]),
    htmlPaths: Object.keys(files).filter((path) => path.endsWith(".html") || path.endsWith(".htm")),
  });

  const projectProfile = resolvePreviewProject(files);
  const isBundler = projectProfile.kind === "bundler";

  reportProgress(onProgress, "파일 시스템 마운트 중…");
  const fsTree = buildFileSystemTree(files);
  const flatFiles = Object.fromEntries(Object.entries(files).map(([path, file]) => [path, file.content]));
  await mountOrSyncWorkspace(container, fsTree, flatFiles);
  snapshotLog("초기 마운트/동기화 완료");

  for (const [path, file] of Object.entries(files)) {
    await writeWorkspaceFile(container, path, file.content);
  }
  for (const [path, bytes] of Object.entries(binaryFiles)) {
    await writeWorkspaceBinaryFile(container, path, bytes);
  }
  snapshotLog("텍스트/바이너리 파일 재기록 완료", {
    textCount: Object.keys(files).length,
    binaryCount: Object.keys(binaryFiles).length,
  });

  try {
    const rootEntries = await container.fs.readdir(".");
    reportProgress(onProgress, `마운트 확인: ${rootEntries.slice(0, 12).join(", ")}`);
    if (rootEntries.includes("styles")) {
      const styleEntries = await container.fs.readdir("styles");
      reportProgress(onProgress, `styles/ 확인: ${styleEntries.join(", ")}`);
    }
  } catch (error) {
    snapshotWarn("readdir 실패", error);
  }

  reportProgress(onProgress, "캡처 브리지 주입 중…");
  const injected = await injectCaptureAssets(container, projectProfile, files);
  snapshotLog("캡처 에셋 주입 완료", injected);
  if (injected.patchedHtmlPaths.length === 0) {
    throw new Error(
      "캡처 브리지를 주입할 HTML(index.html / public/index.html)을 찾지 못했습니다. 프리뷰 엔트리 HTML이 있는 저장소인지 확인해 주세요.",
    );
  }
  reportProgress(onProgress, `HTML 캡처 브리지 주입: ${injected.patchedHtmlPaths.join(", ")}`);

  const readyTimeoutMs = isBundler ? BUNDLER_SERVER_READY_TIMEOUT_MS : SERVER_READY_TIMEOUT_MS;
  snapshotLog("server-ready 대기 시작", { timeoutMs: readyTimeoutMs, isBundler });
  const readyPromise = waitForServerReady(container, readyTimeoutMs);

  let previewEntryPath: string | null = null;
  if (isBundler) {
    await startBundlerPreview(container, projectProfile, onProgress);
  } else {
    previewEntryPath = await startStaticPreview(container, files, onProgress);
  }

  reportProgress(onProgress, "프리뷰 서버 준비 대기 중…");
  const previewUrl = await readyPromise;
  snapshotLog("server-ready 수신", { previewUrl, elapsedMs: Date.now() - pipelineStartedAt });

  reportProgress(onProgress, "렌더링 스냅샷 캡처 중…");
  // Give CRA/Vite a short settle window after server-ready before opening capture iframe.
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, isBundler ? 2500 : 400);
  });
  const captureStartedAt = Date.now();
  const captured = await capturePreviewSnapshot({
    previewUrl,
    mode: "direct",
    waitMs: isBundler ? 2500 : 1000,
    timeoutMs: isBundler ? 60_000 : 30_000,
  });
  snapshotLog("스냅샷 캡처 완료", {
    width: captured.width,
    height: captured.height,
    blobSize: captured.blob.size,
    elapsedMs: Date.now() - captureStartedAt,
  });

  const snapshotId = `snap-${Date.now()}`;
  const renderedFilePaths = buildSnapshotMeta(files, previewEntryPath);
  const imageObjectUrl = URL.createObjectURL(captured.blob);
  snapshotLog("스냅샷 메타 생성", { snapshotId, renderedFilePaths });

  reportProgress(onProgress, "스냅샷을 백엔드로 전송 중…");
  const uploadStartedAt = Date.now();
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
  snapshotLog("백엔드 분석 완료", {
    resultId,
    uploadElapsedMs: Date.now() - uploadStartedAt,
    totalElapsedMs: Date.now() - pipelineStartedAt,
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
