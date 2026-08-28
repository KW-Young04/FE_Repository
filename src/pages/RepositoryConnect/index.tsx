import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import { repositoryApi, type GithubRepositoryResponse } from "@/api/repository";

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/;

const TEXT = {
  title: "GitHub \uC800\uC7A5\uC18C \uC5F0\uACB0",
  subtitle:
    "\uBD84\uC11D\uD560 \uC800\uC7A5\uC18C\uC758 URL\uC744 \uC785\uB825\uD558\uAC70\uB098 \uCD5C\uADFC \uC800\uC7A5\uC18C\uB97C \uC120\uD0DD\uD558\uC138\uC694.",
  repositoryPlaceholder:
    "\uBD84\uC11D\uD560 \uC800\uC7A5\uC18C\uC758 URL\uC744 \uC785\uB825\uD558\uC138\uC694.",
  branchPlaceholder:
    "\uBD84\uC11D\uD560 \uBE0C\uB79C\uCE58 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694. (ex. main)",
  loading: "\uD655\uC778 \uC911...",
  start: "\uBD84\uC11D \uC2DC\uC791 \u2192",
  error:
    "\uC800\uC7A5\uC18C \uB610\uB294 \uBE0C\uB79C\uCE58\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. URL\uACFC \uBE0C\uB79C\uCE58 \uC774\uB984\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
  recent: "\uCD5C\uADFC \uC800\uC7A5\uC18C",
  recentLoading:
    "\uCD5C\uADFC \uC800\uC7A5\uC18C\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.",
  recentError:
    "\uCD5C\uADFC \uC800\uC7A5\uC18C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  emptyTitle:
    "\uC544\uC9C1 \uCD5C\uC885 \uBD84\uC11D\uB41C \uC800\uC7A5\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  emptyDescription:
    "\uC800\uC7A5\uC18C URL\uACFC \uBE0C\uB79C\uCE58\uB97C \uC785\uB825\uD558\uBA74 \uCD5C\uADFC \uBD84\uC11D\uD55C \uC800\uC7A5\uC18C\uAC00 \uC774\uACF3\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
};

function normalizeRepositoryUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}

function getFullName(repository: GithubRepositoryResponse): string {
  return repository.fullName ?? repository.full_name ?? repository.name;
}

function getHtmlUrl(repository: GithubRepositoryResponse): string {
  return (
    repository.htmlUrl ?? repository.html_url ?? `https://github.com/${getFullName(repository)}`
  );
}

function getDefaultBranch(repository: GithubRepositoryResponse): string {
  return repository.defaultBranch ?? repository.default_branch ?? "main";
}

function getUpdatedAt(repository: GithubRepositoryResponse): string {
  const value =
    repository.updatedAt ?? repository.updated_at ?? repository.pushedAt ?? repository.pushed_at;
  if (!value) return "최근 업데이트";

  const updated = new Date(value);
  if (Number.isNaN(updated.getTime())) return "최근 업데이트";

  const diffMs = Date.now() - updated.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

export default function RepositoryConnectPage() {
  const navigate = useNavigate();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branchName, setBranchName] = useState("");
  const [recentRepositories, setRecentRepositories] = useState<GithubRepositoryResponse[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<Record<number, string>>({});
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [recentErrorMessage, setRecentErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
  const normalizedBranchName = branchName.trim();
  const isValidUrl = GITHUB_URL_PATTERN.test(normalizedRepositoryUrl);
  const isAnalyzeEnabled = isValidUrl && Boolean(normalizedBranchName) && !isLoading;

  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;

    const loadRecentRepositories = async () => {
      setIsRecentLoading(true);
      setRecentErrorMessage(null);
      try {
        const repositories = await repositoryApi.getRecentRepositories();
        setRecentRepositories(repositories);
        setSelectedBranches(
          Object.fromEntries(
            repositories.map((repository) => [repository.id, getDefaultBranch(repository)]),
          ),
        );
      } catch {
        setRecentErrorMessage(TEXT.recentError);
      } finally {
        setIsRecentLoading(false);
      }
    };

    void loadRecentRepositories();
  }, []);

  const analyzeRepository = async (targetRepositoryUrl: string, targetBranchName: string) => {
    const normalizedTargetUrl = normalizeRepositoryUrl(targetRepositoryUrl);
    const normalizedTargetBranch = targetBranchName.trim();
    if (!GITHUB_URL_PATTERN.test(normalizedTargetUrl) || !normalizedTargetBranch) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!localStorage.getItem("access_token")) {
        setErrorMessage("로그인이 필요합니다. 메인 페이지에서 GitHub 로그인을 먼저 진행해 주세요.");
        return;
      }

      await repositoryApi.getBranchTree(normalizedTargetUrl, normalizedTargetBranch);
      navigate(
        `/repository-analysis?repo=${encodeURIComponent(normalizedTargetUrl)}&branch=${encodeURIComponent(normalizedTargetBranch)}`,
      );
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response?.status === "number"
          ? (error as { response: { status: number } }).response.status
          : null;

      if (status === 401 || status === 403) {
        localStorage.removeItem("access_token");
        setErrorMessage(
          "로그인이 만료되었거나 권한이 없습니다. 메인에서 GitHub 로그인을 다시 해주세요.",
        );
      } else if (!status) {
        // CORS / Network Error (OAuth 리다이렉트 추종 실패 등)
        setErrorMessage(
          "서버 인증에 실패했습니다. 백엔드가 실행 중인지 확인하고, 메인에서 다시 로그인해 주세요.",
        );
      } else {
        setErrorMessage(
          "저장소를 찾을 수 없습니다. URL을 확인하거나 공개 저장소인지 확인해 주세요.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!isAnalyzeEnabled) return;
    await analyzeRepository(normalizedRepositoryUrl, normalizedBranchName);
  };

  return (
    <main className="min-h-screen bg-[#f8f9fb] px-6 py-10 md:px-10">
      <section className="mx-auto w-full max-w-6xl py-16">
        <h1 className="text-4xl font-extrabold text-slate-900">{TEXT.title}</h1>
        <p className="mt-3 text-2xl font-semibold text-slate-600">{TEXT.subtitle}</p>

        <div className="mt-12 flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <input
              type="text"
              value={repositoryUrl}
              onChange={(event) => {
                setRepositoryUrl(event.target.value);
                setErrorMessage(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && isAnalyzeEnabled) {
                  void handleAnalyze();
                }
              }}
              placeholder={TEXT.repositoryPlaceholder}
              className="h-14 w-full rounded-none border border-slate-300 bg-white px-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400"
            />
            <input
              type="text"
              value={branchName}
              onChange={(event) => {
                setBranchName(event.target.value);
                setErrorMessage(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && isAnalyzeEnabled) {
                  void handleAnalyze();
                }
              }}
              placeholder={TEXT.branchPlaceholder}
              className="h-14 w-full rounded-none border border-slate-300 bg-white px-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400"
            />
          </div>

          <Button
            variant={isAnalyzeEnabled ? "default" : "disabled"}
            disabled={!isAnalyzeEnabled}
            onClick={() => {
              void handleAnalyze();
            }}
            className="h-14 min-w-44 rounded-none text-xl"
          >
            {isLoading ? TEXT.loading : TEXT.start}
          </Button>
        </div>

        {errorMessage && <p className="mt-3 text-sm font-medium text-red-500">{errorMessage}</p>}

        <div className="mt-16">
          <h2 className="text-3xl font-extrabold text-slate-700">{TEXT.recent}</h2>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {isRecentLoading ? (
              <div className="flex min-h-64 items-center justify-center px-6 py-14 text-center text-lg font-bold text-slate-500">
                {TEXT.recentLoading}
              </div>
            ) : recentErrorMessage ? (
              <div className="flex min-h-64 items-center justify-center px-6 py-14 text-center text-lg font-bold text-red-500">
                {recentErrorMessage}
              </div>
            ) : recentRepositories.length > 0 ? (
              <ul>
                {recentRepositories.map((repository) => {
                  const fullName = getFullName(repository);
                  const branch = selectedBranches[repository.id] ?? getDefaultBranch(repository);
                  return (
                    <li key={repository.id} className="border-b border-slate-100 last:border-b-0">
                      <div className="flex items-center gap-4 px-6 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            void analyzeRepository(getHtmlUrl(repository), branch);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-4 text-left transition hover:opacity-80"
                        >
                          <span className="text-4xl leading-none">▱</span>
                          <span className="min-w-0">
                            <strong className="block truncate text-xl font-extrabold text-slate-900">
                              {fullName}
                            </strong>
                            <span className="mt-1 block truncate text-sm font-medium text-slate-500">
                              {getUpdatedAt(repository)} · {repository.language ?? "Unknown"}
                              {repository.privateRepo || repository.private
                                ? " · Private"
                                : " · Public"}
                            </span>
                          </span>
                        </button>
                        <div className="flex h-9 items-center rounded-full border border-violet-200 bg-violet-50 px-3 text-violet-600">
                          <span className="mr-1 text-sm">⌁</span>
                          <select
                            value={branch}
                            onChange={(event) => {
                              setSelectedBranches((prev) => ({
                                ...prev,
                                [repository.id]: event.target.value,
                              }));
                            }}
                            className="h-full cursor-pointer bg-transparent text-sm font-bold text-violet-600 outline-none"
                            aria-label={`${fullName} 브랜치 선택`}
                          >
                            <option value={branch}>{branch}</option>
                            {branch !== "main" && <option value="main">main</option>}
                            {branch !== "develop-new" && (
                              <option value="develop-new">develop-new</option>
                            )}
                            {branch !== "develop" && <option value="develop">develop</option>}
                            {branch !== "master" && <option value="master">master</option>}
                          </select>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 py-14 text-center">
                <p className="text-xl font-extrabold text-slate-800">{TEXT.emptyTitle}</p>
                <p className="mt-2 text-base font-semibold text-slate-500">
                  {TEXT.emptyDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
