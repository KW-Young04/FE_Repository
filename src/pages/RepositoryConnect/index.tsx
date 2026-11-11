import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import RepositoryHeader from "@/components/RepositoryHeader";
import { repositoryApi, type GithubRepositoryResponse } from "@/api/repository";
import { useAuthStore } from "@/stores/authStore";
import {
  clearAccessToken,
  consumeAccessTokenFromUrl,
  getAccessToken,
  parseUserFromToken,
} from "@/utils/auth";

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
  logout: "\uB85C\uADF8\uC544\uC6C3",
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
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [accessToken, setAccessToken] = useState<string | null>(null);
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
    const tokenFromUrl = consumeAccessTokenFromUrl();
    const effectiveToken = tokenFromUrl ?? getAccessToken();
    if (effectiveToken) {
      const parsedUser = parseUserFromToken(effectiveToken);
      if (parsedUser) setUser(parsedUser);
    }
    setAccessToken(effectiveToken);
  }, [setUser]);

  const handleLogout = () => {
    logout();
    setAccessToken(null);
    navigate("/");
  };

  const isLoggedIn = Boolean(accessToken);

  useEffect(() => {
    if (!accessToken) return;

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
  }, [accessToken]);

  const analyzeRepository = async (targetRepositoryUrl: string, targetBranchName: string) => {
    const normalizedTargetUrl = normalizeRepositoryUrl(targetRepositoryUrl);
    const normalizedTargetBranch = targetBranchName.trim();
    if (!GITHUB_URL_PATTERN.test(normalizedTargetUrl) || !normalizedTargetBranch) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!getAccessToken()) {
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
        clearAccessToken();
        setAccessToken(null);
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
    <main className="min-h-screen bg-[#f8f9fb]">
      <RepositoryHeader showLogout={isLoggedIn} onLogout={handleLogout} />

      <section className="mx-auto w-full max-w-6xl px-6 pt-14 pb-24 md:px-10">
        <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 sm:text-[32px]">
          {TEXT.title}
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-slate-500 sm:text-[17px]">{TEXT.subtitle}</p>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-300 bg-white">
          <label className="flex h-16 items-center border-b border-slate-200">
            <span className="w-24 shrink-0 px-5 text-[14px] font-medium text-slate-400">URL</span>
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
              className="h-full min-w-0 flex-1 bg-transparent pr-5 text-[16px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </label>
          <label className="flex h-16 items-center">
            <span className="w-24 shrink-0 px-5 text-[14px] font-medium text-slate-400">
              Branch
            </span>
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
              className="h-full min-w-0 flex-1 bg-transparent pr-5 text-[16px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
          </label>
        </div>

        <Button
          variant={isAnalyzeEnabled ? "default" : "disabled"}
          disabled={!isAnalyzeEnabled}
          onClick={() => {
            void handleAnalyze();
          }}
          className="mt-5 h-14 w-full rounded-none text-[17px]"
        >
          {isLoading ? TEXT.loading : TEXT.start}
        </Button>

        {errorMessage && <p className="mt-3 text-sm font-medium text-red-500">{errorMessage}</p>}

        <div className="mt-16">
          <h2 className="text-[20px] font-bold text-slate-800">{TEXT.recent}</h2>
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {isRecentLoading ? (
              <div className="flex min-h-64 items-center justify-center px-6 py-14 text-center text-[15px] font-medium text-slate-500">
                {TEXT.recentLoading}
              </div>
            ) : recentErrorMessage ? (
              <div className="flex min-h-64 items-center justify-center px-6 py-14 text-center text-[15px] font-medium text-red-500">
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
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                            <svg
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              className="h-5 w-5"
                              aria-hidden="true"
                            >
                              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                            </svg>
                          </span>
                          <span className="min-w-0">
                            <strong className="block truncate text-[15px] font-bold text-slate-800">
                              {fullName}
                            </strong>
                            <span className="mt-1 block truncate text-[13px] text-slate-500">
                              {getUpdatedAt(repository)} · {repository.language ?? "Unknown"}
                              {repository.privateRepo || repository.private
                                ? " · Private"
                                : " · Public"}
                            </span>
                          </span>
                        </button>
                        <div className="flex h-9 items-center rounded-full border border-point-200 bg-point-50 px-3 text-point">
                          <svg
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className="mr-1.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                          >
                            <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
                          </svg>
                          <select
                            value={branch}
                            onChange={(event) => {
                              setSelectedBranches((prev) => ({
                                ...prev,
                                [repository.id]: event.target.value,
                              }));
                            }}
                            className="h-full cursor-pointer bg-transparent text-[13px] font-semibold text-point outline-none"
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
                <p className="text-[15px] font-bold text-slate-800">{TEXT.emptyTitle}</p>
                <p className="mt-2 text-[14px] leading-6 text-slate-500">{TEXT.emptyDescription}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
