import type { WebContainer } from "@webcontainer/api";
import type { PreviewProjectProfile } from "@/pages/RepositoryWorkspace/previewProject";
import { writeWorkspaceFile } from "@/utils/webContainerFilesystem";
import { CAPTURE_HOST_HTML } from "./captureHostTemplate";

function resolveCaptureHostPath(profile: PreviewProjectProfile): string {
  if (profile.kind === "bundler") {
    const root = profile.workspaceRoot;
    return root
      ? `${root}/public/__cursor__/capture-host.html`
      : "public/__cursor__/capture-host.html";
  }

  return "__cursor__/capture-host.html";
}

export async function injectCaptureAssets(
  container: WebContainer,
  profile: PreviewProjectProfile,
): Promise<string> {
  const captureHostPath = resolveCaptureHostPath(profile);
  await writeWorkspaceFile(container, captureHostPath, CAPTURE_HOST_HTML);
  return captureHostPath;
}
