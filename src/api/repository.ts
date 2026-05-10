import { apiClient } from './client';

export interface TreeNode {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

export interface RepositoryTreeResponse {
  owner: string;
  repo: string;
  nodes: TreeNode[];
}

export interface RepositoryFileResponse {
  owner: string;
  repo: string;
  path: string;
  content: string;
}

interface ApiResponse<T> {
  data: T;
}

export const repositoryApi = {
  getTree: async (repositoryUrl: string): Promise<RepositoryTreeResponse> => {
    const response = await apiClient.get<ApiResponse<RepositoryTreeResponse>>(
      '/api/repositories/tree',
      { params: { repositoryUrl } },
    );
    return response.data.data;
  },

  getFile: async (repositoryUrl: string, path: string): Promise<RepositoryFileResponse> => {
    const response = await apiClient.get<ApiResponse<RepositoryFileResponse>>(
      '/api/repositories/file',
      { params: { repositoryUrl, path } },
    );
    return response.data.data;
  },
};
