import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Button";

function normalizeRepositoryUrl(value: string): string {
  return value.trim();
}

function getDisplayName(repositoryUrl: string): string {
  if (!repositoryUrl) return "저장소 미지정";

  try {
    const url = new URL(repositoryUrl);
    return url.pathname.replace(/^\//, "") || repositoryUrl;
  } catch {
    return repositoryUrl;
  }
}

export default function RepositoryWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositoryUrl = normalizeRepositoryUrl(searchParams.get("repo") ?? "");
  const displayName = useMemo(() => getDisplayName(repositoryUrl), [repositoryUrl]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">워크스페이스</p>
          <h1 className="text-xl font-extrabold text-slate-900">{displayName}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            className="h-10 px-4 text-sm"
            onClick={() => navigate("/repository-connect")}
          >
            저장소 다시 연결
          </Button>
        </div>
      </header>

      <section className="flex h-[calc(100svh-8.5rem)] min-h-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
        <div className="max-w-lg px-6 text-center">
          <p className="text-2xl font-extrabold text-slate-900">새 워크스페이스</p>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">
            이 페이지는 새 UI/UX 분석 워크스페이스를 위한 시작 지점입니다.
            기존 WebContainer 기반 구현은 테스트 경로에서 확인할 수 있습니다.
          </p>
          {repositoryUrl ? (
            <p className="mt-4 break-all text-sm text-slate-500">{repositoryUrl}</p>
          ) : (
            <p className="mt-4 text-sm font-medium text-amber-600">
              repo 쿼리 파라미터가 없습니다. 분석 완료 후 진입해 주세요.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
