import Button from "@/components/Button";
import type { RepositoryTreeResponse } from "@/api/repository";

interface WorkspaceHeaderProps {
  tree: RepositoryTreeResponse | null;
  repositoryUrl: string;
  isRestarting: boolean;
  hasFiles: boolean;
  onRestartPreview: () => void | Promise<void>;
  onNavigateToConnect: () => void;
}

export default function WorkspaceHeader({
  tree,
  repositoryUrl,
  isRestarting,
  hasFiles,
  onRestartPreview,
  onNavigateToConnect,
}: WorkspaceHeaderProps) {
  return (
    <header className="mb-4 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">레포지토리 워크스페이스</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {tree ? `${tree.owner}/${tree.repo}` : repositoryUrl}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={isRestarting ? "disabled" : "blue"}
          disabled={isRestarting || !hasFiles}
          onClick={() => {
            void onRestartPreview();
          }}
          className="h-11 rounded-none px-5 text-sm"
        >
          {isRestarting ? "재시작 중..." : "프리뷰 재시작"}
        </Button>
        <Button
          variant="default"
          onClick={onNavigateToConnect}
          className="h-11 rounded-none px-5 text-sm"
        >
          다른 저장소 선택
        </Button>
      </div>
    </header>
  );
}
