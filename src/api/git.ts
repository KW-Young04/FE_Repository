import axios from "axios";

import { apiClient } from "./client";

/** 커밋/푸시는 원격 통신을 포함하므로 기본 10초 타임아웃으로는 부족하다. */
const GIT_COMMAND_TIMEOUT_MS = 60_000;

export type GitFileStatus = "ADDED" | "MODIFIED" | "DELETED" | "RENAMED" | "UNTRACKED";

export interface GitFileChangeResponse {
  path: string;
  status: GitFileStatus;
  addedLines: number;
  deletedLines: number;
}

export interface GitStatusResponse {
  branch: string;
  hasChanges: boolean;
  files: GitFileChangeResponse[];
}

export interface GitDiffResponse {
  path: string;
  diff: string;
}

export interface GitBranchResponse {
  currentBranch: string;
  branches: string[];
}

export interface GitCommitRequest {
  message: string;
  files: string[];
}

export interface GitCommitResponse {
  success: boolean;
  commitHash: string | null;
  message: string;
  changedFileCount: number;
}

export interface GitPushRequest {
  remote?: string;
}

export interface GitPushResponse {
  success: boolean;
  remote: string;
  branch: string;
}

export interface GitCommitAndPushRequest extends GitCommitRequest {
  remote?: string;
}

export interface GitOperationResult {
  success: boolean;
  code: string;
  message: string;
  commitHash: string | null;
}

export interface GitCommitAndPushResponse {
  commit: GitOperationResult;
  push: GitOperationResult;
}

/**
 * /api/git/* 는 ApiResponse 래퍼 없이 DTO를 그대로 반환하고,
 * 실패 시 GitErrorResponse({ success, code, message }) 를 HTTP 에러 코드와 함께 내려준다.
 */
export function toGitErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; code?: string } | undefined;
    if (data?.message) {
      return data.code ? `${data.message} (${data.code})` : data.message;
    }
    if (error.code === "ECONNABORTED") {
      return "Git 요청이 시간 내에 완료되지 않았습니다.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const gitApi = {
  getStatus: async (): Promise<GitStatusResponse> => {
    const response = await apiClient.get<GitStatusResponse>("/api/git/status");
    return response.data;
  },

  getDiff: async (path: string): Promise<GitDiffResponse> => {
    const response = await apiClient.get<GitDiffResponse>("/api/git/diff", {
      params: { path },
    });
    return response.data;
  },

  getBranches: async (): Promise<GitBranchResponse> => {
    const response = await apiClient.get<GitBranchResponse>("/api/git/branches");
    return response.data;
  },

  commit: async (request: GitCommitRequest): Promise<GitCommitResponse> => {
    const response = await apiClient.post<GitCommitResponse>("/api/git/commit", request, {
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    return response.data;
  },

  push: async (request: GitPushRequest = {}): Promise<GitPushResponse> => {
    const response = await apiClient.post<GitPushResponse>("/api/git/push", request, {
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    return response.data;
  },

  commitAndPush: async (request: GitCommitAndPushRequest): Promise<GitCommitAndPushResponse> => {
    const response = await apiClient.post<GitCommitAndPushResponse>(
      "/api/git/commit-and-push",
      request,
      { timeout: GIT_COMMAND_TIMEOUT_MS },
    );
    return response.data;
  },
};
