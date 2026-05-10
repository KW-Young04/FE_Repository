import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";

const recentRepositories = [
  {
    id: "1",
    fullName: "asdasdaad/sadasd/sadasd",
    updatedAt: "2시간 전",
    techStack: "React",
    fileCount: "34개 파일",
  },
  {
    id: "2",
    fullName: "asdasdaad/sadasd/sadasd",
    updatedAt: "2시간 전",
    techStack: "React",
    fileCount: "34개 파일",
  },
  {
    id: "3",
    fullName: "asdasdaad/sadasd/sadasd",
    updatedAt: "2시간 전",
    techStack: "React",
    fileCount: "34개 파일",
  },
  {
    id: "4",
    fullName: "asdasdaad/sadasd/sadasd",
    updatedAt: "2시간 전",
    techStack: "React",
    fileCount: "34개 파일",
  },
  {
    id: "5",
    fullName: "asdasdaad/sadasd/sadasd",
    updatedAt: "2시간 전",
    techStack: "React",
    fileCount: "34개 파일",
  },
];

export default function MainRepositoryConnect() {
  const navigate = useNavigate();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const openAnalysisPage = (repositoryName: string) => {
    const trimmedName = repositoryName.trim();
    if (!trimmedName) {
      return;
    }

    navigate(`/repository-analysis?repo=${encodeURIComponent(trimmedName)}`);
  };

  const isAnalyzeEnabled = repositoryUrl.trim().length > 0;

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
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="분석할 저장소의 URL을 입력하세요."
            className="h-14 w-full rounded-none border border-slate-300 px-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400"
          />
          <Button
            variant={isAnalyzeEnabled ? "default" : "disabled"}
            disabled={!isAnalyzeEnabled}
            onClick={() => openAnalysisPage(repositoryUrl)}
            className="h-14 min-w-40 rounded-none"
          >
            분석 시작 →
          </Button>
        </div>

        <div className="mt-14">
          <h2 className="text-3xl font-extrabold text-slate-800">최근 저장소</h2>
          <ul className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {recentRepositories.map((repository) => (
              <li key={repository.id} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => openAnalysisPage(repository.fullName)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-slate-50"
                >
                  <span className="text-3xl">🗂️</span>
                  <span>
                    <strong className="block text-xl font-extrabold text-slate-900">
                      {repository.fullName}
                    </strong>
                    <span className="mt-1 block text-sm font-medium text-slate-500">
                      {repository.updatedAt} · {repository.techStack} ·{" "}
                      {repository.fileCount}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </main>
  );
}
