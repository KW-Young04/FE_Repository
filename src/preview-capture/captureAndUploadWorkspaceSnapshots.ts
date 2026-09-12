import { uploadWcagAnalysis, type SnapshotUploadItem } from "@/api/analysis";
import type { PreviewRuntimeKind } from "@/workspace/previewProject";

import { buildSnapshotMeta } from "./buildSnapshotMeta";
import { capturePreviewSnapshot } from "./capturePreviewSnapshot";
import { snapshotLog, snapshotWarn } from "./snapshotLogger";
import { buildStaticSnapshotUrl, getStaticSnapshotPagePaths } from "./snapshotPagePaths";

export interface CaptureAndUploadWorkspaceSnapshotsOptions {
  repositoryUrl: string;
  branchName: string;
  previewUrl: string;
  filesByPath: Record<string, { path: string }>;
  previewRuntimeKind: PreviewRuntimeKind;
  previewEntryPath: string | null;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}

export interface CaptureAndUploadWorkspaceSnapshotsResult {
  resultId: number;
  snapshotId: string;
  snapshotCount: number;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

/**
 * 이미 실행 중인 워크스페이스 프리뷰에서 스냅샷을 찍어
 * 전체 WCAG 분석(POST /api/analysis/wcag)으로 업로드한다.
 */
export async function captureAndUploadWorkspaceSnapshots(
  options: CaptureAndUploadWorkspaceSnapshotsOptions,
): Promise<CaptureAndUploadWorkspaceSnapshotsResult> {
  const {
    repositoryUrl,
    branchName,
    previewUrl,
    filesByPath,
    previewRuntimeKind,
    previewEntryPath,
    onProgress,
    signal,
  } = options;

  if (!previewUrl.trim()) {
    throw new Error("프리뷰 URL이 없어 스냅샷을 촬영할 수 없습니다.");
  }

  const isBundler = previewRuntimeKind === "bundler";
  const snapshotPagePaths = isBundler
    ? [previewEntryPath ?? "index.html"]
    : getStaticSnapshotPagePaths(filesByPath, previewEntryPath);

  if (snapshotPagePaths.length === 0) {
    throw new Error("캡처할 HTML 페이지를 찾지 못했습니다.");
  }

  snapshotLog("워크스페이스 재검사 스냅샷 시작", {
    repositoryUrl,
    branchName,
    previewUrl,
    previewRuntimeKind,
    pageCount: snapshotPagePaths.length,
    pages: snapshotPagePaths,
  });

  const snapshotItems: SnapshotUploadItem[] = [];

  for (let index = 0; index < snapshotPagePaths.length; index += 1) {
    assertNotAborted(signal);
    const pagePath = snapshotPagePaths[index];
    const pageUrl = isBundler ? previewUrl : buildStaticSnapshotUrl(previewUrl, pagePath, index);

    onProgress?.(
      snapshotPagePaths.length > 1
        ? `렌더링 스냅샷 캡처 중 (${index + 1}/${snapshotPagePaths.length})…`
        : "렌더링 스냅샷 캡처 중…",
    );

    let captured;
    try {
      captured = await capturePreviewSnapshot({
        previewUrl: pageUrl,
        mode: "direct",
        waitMs: isBundler ? 3500 : 1000,
        timeoutMs: isBundler ? 90_000 : 45_000,
      });
    } catch (directError) {
      if (!isBundler) throw directError;
      snapshotWarn("direct 캡처 실패 — React SPA hash host 폴백 시도", directError);
      onProgress?.("React SPA 캡처 폴백(hash host) 시도 중…");
      captured = await capturePreviewSnapshot({
        previewUrl,
        mode: "host",
        hostStrategy: "hash",
        waitMs: 3500,
        timeoutMs: 90_000,
      });
    }

    assertNotAborted(signal);

    const snapshotId = `snap-${Date.now()}-${index + 1}`;
    const renderedFilePaths = buildSnapshotMeta(filesByPath, pagePath);
    snapshotItems.push({
      snapshotId,
      image: captured.blob,
      renderedFilePaths,
    });

    snapshotLog("워크스페이스 스냅샷 캡처 완료", {
      pagePath,
      snapshotId,
      blobSize: captured.blob.size,
      renderedFilePaths,
    });
  }

  assertNotAborted(signal);
  onProgress?.("스냅샷을 백엔드로 전송 중…");

  const resultId = await uploadWcagAnalysis({
    repositoryUrl,
    branchName: branchName || "HEAD",
    snapshots: snapshotItems,
  });

  snapshotLog("워크스페이스 재검사 업로드 완료", {
    resultId,
    snapshotCount: snapshotItems.length,
  });

  return {
    resultId,
    snapshotId: snapshotItems[0].snapshotId,
    snapshotCount: snapshotItems.length,
  };
}
