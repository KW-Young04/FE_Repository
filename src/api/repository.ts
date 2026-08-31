import { apiClient } from "./client";

export interface TreeNode {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface RepositoryTreeResponse {
  owner: string;
  repo: string;
  branch?: string;
  nodes: TreeNode[];
}

export interface RepositoryFileResponse {
  owner: string;
  repo: string;
  branch?: string;
  path: string;
  content: string;
  encoding?: "utf-8" | "base64" | string;
}

export interface GithubRepositoryResponse {
  id: number;
  name: string;
  fullName?: string;
  full_name?: string;
  htmlUrl?: string;
  html_url?: string;
  description?: string | null;
  privateRepo?: boolean;
  private?: boolean;
  language?: string | null;
  updatedAt?: string;
  updated_at?: string;
  pushedAt?: string;
  pushed_at?: string;
  defaultBranch?: string;
  default_branch?: string;
}

interface ApiResponse<T> {
  data: T;
}

export const repositoryApi = {
  getTree: async (repositoryUrl: string): Promise<RepositoryTreeResponse> => {
    const response = await apiClient.get<ApiResponse<RepositoryTreeResponse>>(
      "/api/repositories/tree",
      { params: { repositoryUrl } },
    );
    return response.data.data;
  },

  getBranchTree: async (
    repositoryUrl: string,
    branchName: string,
  ): Promise<RepositoryTreeResponse> => {
    const response = await apiClient.post<ApiResponse<RepositoryTreeResponse>>(
      "/api/repositories/branch",
      { repositoryUrl, branchName },
    );
    return response.data.data;
  },

  getFile: async (
    repositoryUrl: string,
    path: string,
    branchName?: string,
  ): Promise<RepositoryFileResponse> => {
    const response = await apiClient.get<ApiResponse<RepositoryFileResponse>>(
      "/api/repositories/file",
      { params: { repositoryUrl, path, branchName } },
    );
    return response.data.data;
  },

  getBranchFile: async (
    repositoryUrl: string,
    branchName: string,
    path: string,
  ): Promise<RepositoryFileResponse> => {
    const response = await apiClient.post<ApiResponse<RepositoryFileResponse>>(
      "/api/repositories/branch/file",
      { repositoryUrl, branchName, path },
    );
    return response.data.data;
  },

  getRecentRepositories: async (): Promise<GithubRepositoryResponse[]> => {
    const response = await apiClient.get<GithubRepositoryResponse[]>(
      "/api/github/repositories/recent",
    );
    return response.data;
  },
};
