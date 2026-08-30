import { apiClient } from "./client";

interface ApiResponse<T> {
  data: T;
}

export interface SnapshotUploadItem {
  snapshotId: string;
  image: Blob;
  renderedFilePaths: string[];
}

export interface UploadWcagAnalysisPayload {
  repositoryUrl: string;
  branchName: string;
  snapshots: SnapshotUploadItem[];
}

export interface RealtimeIssueDetail {
  wcagItemId: number;
  sc: string;
  title: string;
  levelType: string;
  description: string;
  /** 백엔드는 위반 항목만 내려주므로 사실상 "FAIL" 이다. */
  status: string;
  targetFilePath: string;
  targetSelector: string;
  originalCodeBlock: string;
  suggestion: string;
  measuredValue: string;
  thresholdValue: string;
}

export interface RealtimeAnalysisResponse {
  success: boolean;
  timestamp: string;
  issueCount: number;
  issues: RealtimeIssueDetail[];
}

/** 정적 분석은 룰 수에 비례해 오래 걸릴 수 있어 인스턴스 기본 10초로는 부족하다. */
const REALTIME_ANALYSIS_TIMEOUT_MS = 30_000;

/** 에디터 디바운스 전용 실시간 정적 분석. 결과는 DB에 저장되지 않는다. */
export async function analyzeRealtimeCode(
  code: string,
  targetFilePath: string,
  signal?: AbortSignal,
): Promise<RealtimeAnalysisResponse> {
  const response = await apiClient.post<RealtimeAnalysisResponse>(
    "/api/analysis/realtime",
    { code, targetFilePath },
    { timeout: REALTIME_ANALYSIS_TIMEOUT_MS, signal },
  );

  return response.data;
}

export async function uploadWcagAnalysis(payload: UploadWcagAnalysisPayload): Promise<number> {
  const formData = new FormData();
  formData.append("repositoryUrl", payload.repositoryUrl);
  formData.append("branchName", payload.branchName);

  const snapshotMeta = payload.snapshots.map((snapshot) => ({
    snapshotId: snapshot.snapshotId,
    renderedFilePaths: snapshot.renderedFilePaths,
  }));

  for (const snapshot of payload.snapshots) {
    // 백엔드는 MultipartFile.originalFilename == snapshotId 로 매칭한다.
    // 확장자(.png)를 붙이면 매칭에 실패한다.
    formData.append("images", snapshot.image, snapshot.snapshotId);
  }

  formData.append("snapshotMeta", JSON.stringify(snapshotMeta));

  const response = await apiClient.post<ApiResponse<number>>("/api/analysis/wcag", formData, {
    timeout: 120_000,
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          // 인스턴스 기본 Content-Type(application/json)이 multipart boundary를 막지 않도록 제거
          delete headers["Content-Type"];
        }
        return data;
      },
    ],
  });

  return response.data.data;
}
