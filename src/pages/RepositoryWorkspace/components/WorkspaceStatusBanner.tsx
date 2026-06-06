import { MAX_INITIAL_FILES } from "../constants";
import type { LoadDiagnostics } from "../types";
import { formatDuration } from "../utils";

interface WorkspaceStatusBannerProps {
  loadError: string | null;
  loadingMessage: string;
  hasFiles: boolean;
  truncatedCount: number;
  isBackgroundLoading: boolean;
  diagnostics: LoadDiagnostics;
}

export default function WorkspaceStatusBanner({
  loadError,
  loadingMessage,
  hasFiles,
  truncatedCount,
  isBackgroundLoading,
  diagnostics,
}: WorkspaceStatusBannerProps) {
  return (
    <>
      {loadError && (
        <section className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <p>{loadError}</p>
          <p className="mt-2">잠시 후 다시 시도해 주세요.</p>
        </section>
      )}

      {!loadError && !hasFiles && (
        <section className="mb-4 border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          {loadingMessage}
        </section>
      )}

      {truncatedCount > 0 && (
        <section className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          파일 수가 많아 처음 {MAX_INITIAL_FILES}개만 로드했습니다. 필요한 파일은 클릭 시 추가 로드됩니다.
          (생략: {truncatedCount}개)
        </section>
      )}

      {isBackgroundLoading && (
        <section className="mb-4 border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
          프리뷰는 먼저 시작했고, 나머지 파일은 백그라운드로 동기화 중입니다.
        </section>
      )}

      <section className="mb-4 border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">진단 로그 요약</p>
        <p className="mt-1">
          트리: {formatDuration(diagnostics.treeMs)} / 핵심 파일: {formatDuration(diagnostics.coreMs)} / 런타임:{" "}
          {formatDuration(diagnostics.runtimeMs)} / 백그라운드: {formatDuration(diagnostics.backgroundMs)}
        </p>
        <p>
          핵심 로드 실패: {diagnostics.coreFailedPaths.length}개 / 백그라운드 로드 실패:{" "}
          {diagnostics.backgroundFailedPaths.length}개
        </p>
        {diagnostics.lastError && <p className="text-rose-600">마지막 오류: {diagnostics.lastError}</p>}
      </section>
    </>
  );
}
