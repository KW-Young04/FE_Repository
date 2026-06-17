import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import { repositoryApi } from "@/api/repository";

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/;

function normalizeRepositoryUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}

export default function RepositoryConnectPage() {
  const navigate = useNavigate();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidUrl = GITHUB_URL_PATTERN.test(normalizeRepositoryUrl(repositoryUrl));
  const isAnalyzeEnabled = isValidUrl && !isLoading;

  const handleAnalyze = async (url: string) => {
    const normalized = normalizeRepositoryUrl(url);
    if (!normalized) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await repositoryApi.getTree(normalized);
      navigate(`/repository-analysis?repo=${encodeURIComponent(normalized)}`);
    } catch {
      setErrorMessage(
        "저장소를 찾을 수 없습니다. URL을 확인하거나 공개 저장소인지 확인해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-10 md:px-10">
      <section className="mx-auto w-full max-w-6xl py-6">
        <h1 className="text-4xl font-extrabold text-slate-900">GitHub 저장소 연결</h1>
        <p className="mt-3 text-2xl font-semibold text-slate-600">
          분석할 저장소 URL을 입력하거나 최근 저장소를 선택하세요.
        </p>

        <div className="mt-12 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={repositoryUrl}
            onChange={(event) => {
              setRepositoryUrl(event.target.value);
              setErrorMessage(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isAnalyzeEnabled) {
                handleAnalyze(repositoryUrl);
              }
            }}
            placeholder="https://github.com/owner/repository"
            className="h-14 w-full rounded-none border border-slate-300 px-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400"
          />
          <Button
            variant={isAnalyzeEnabled ? "default" : "disabled"}
            disabled={!isAnalyzeEnabled}
            onClick={() => handleAnalyze(repositoryUrl)}
            className="h-14 min-w-40 rounded-none"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                확인 중…
              </span>
            ) : (
              "분석 시작 →"
            )}
          </Button>
        </div>

        {errorMessage && (
          <p className="mt-3 text-sm font-medium text-red-500">{errorMessage}</p>
        )}
      </section>
    </main>
  );
}
