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
