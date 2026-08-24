import { useRepositoryWorkspace } from "@/pages/RepositoryWorkspaceTest/useRepositoryWorkspace";

export function useWorkspacePreview() {
  const workspace = useRepositoryWorkspace();

  return {
    repositoryUrl: workspace.repositoryUrl,
    previewStatus: workspace.previewStatus,
    previewUrl: workspace.previewUrl,
    previewRevision: workspace.previewRevision,
    previewProjectLabel: workspace.previewProjectLabel,
    runtimeError: workspace.runtimeError,
    loadError: workspace.loadError,
    loadingMessage: workspace.loadingMessage,
  };
}
