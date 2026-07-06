import RepositoryWorkspaceView from "./RepositoryWorkspaceView";
import { useRepositoryWorkspace } from "./useRepositoryWorkspace";

export default function RepositoryWorkspaceTestPage() {
  const workspace = useRepositoryWorkspace();
  return <RepositoryWorkspaceView {...workspace} />;
}
