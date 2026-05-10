import { useState } from "react";
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
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [selectedRepository, setSelectedRepository] = useState("");

  const openAnalyzeModal = (repositoryName: string) => {
    setSelectedRepository(repositoryName);
  };

  const closeAnalyzeModal = () => {
    setSelectedRepository("");
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
            onClick={() => openAnalyzeModal(repositoryUrl.trim())}
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
                  onClick={() => openAnalyzeModal(repository.fullName)}
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

      {selectedRepository ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={closeAnalyzeModal}
              className="absolute right-5 top-4 text-3xl leading-none text-slate-500 transition hover:text-slate-700"
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-center text-2xl font-extrabold text-sky-600">
              해당 저장소를 분석할까요?
            </h2>
            <p className="mt-5 rounded-md bg-slate-100 px-4 py-3 text-center text-lg font-semibold text-slate-700">
              {selectedRepository}
            </p>
            <p className="mt-4 text-center text-sm text-slate-600">
              선택한 GitHub 저장소의 UI/UX 문제와 코드 개선 포인트를 분석합니다.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                onClick={closeAnalyzeModal}
                variant="default"
                className="h-12 rounded-lg text-base"
              >
                취소
              </Button>
              <Button
                onClick={closeAnalyzeModal}
                variant="blue"
                className="h-12 rounded-lg text-base"
              >
                분석 시작 →
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
