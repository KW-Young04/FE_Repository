import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Button";

const analysisSteps = [
  { title: "파일 구조 파악", description: "34개 파일 완료", icon: "🗂️" },
  { title: "코드 파싱", description: "87개 컴포넌트 완료", icon: "💻" },
  { title: "렌더링 스냅샷", description: "스냅샷 완료", icon: "🖼️" },
  { title: "AI 분석", description: "7개의 이슈 발견", icon: "🤖" },
];

export default function AnalysisProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const repositoryName = searchParams.get("repo") ?? "myteam/dashboard-v2";
  const isAnalysisComplete = analysisProgress >= 100;
  const completedStepCount = Math.floor(analysisProgress / 25);
  const estimatedMinutes = Math.max(1, Math.ceil((100 - analysisProgress) / 12.5));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnalysisProgress((previousProgress) => {
        const nextProgress = previousProgress + 5;
        return nextProgress >= 100 ? 100 : nextProgress;
      });
    }, 350);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const statusMessage = useMemo(() => {
    if (isAnalysisComplete) {
      return "분석이 완료되었습니다!";
    }

    return `예상 대기 시간 ${estimatedMinutes}분`;
  }, [estimatedMinutes, isAnalysisComplete]);

  return (
    <main className="flex min-h-screen items-center bg-white px-6 py-10 md:px-10">
      <section className="mx-auto w-full max-w-5xl -translate-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">저장소 분석</h1>
        <p className="mt-2 text-xl font-semibold text-slate-600">{repositoryName}</p>

        <ul className="mt-8 space-y-4">
          {analysisSteps.map((step, index) => {
            const isDone = completedStepCount > index;

            return (
              <li
                key={step.title}
                className="flex items-center justify-between border border-slate-200 bg-white px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xl">
                    {step.icon}
                  </span>
                  <span>
                    <strong className="block text-xl font-extrabold text-slate-900">
                      {step.title}
                    </strong>
                    <span className="block text-base font-semibold text-slate-700">
                      {step.description}
                    </span>
                  </span>
                </div>

                {isDone ? (
                  <span className="text-xl font-extrabold text-green-600">완료</span>
                ) : (
                  <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-300"
            style={{ width: `${analysisProgress}%` }}
          />
        </div>

        {isAnalysisComplete ? (
          <p className="mt-4 text-xl font-extrabold text-slate-800">{statusMessage}</p>
        ) : (
          <p className="mt-4 text-xl font-semibold text-slate-700">
            예상 대기 시간{" "}
            <span className="font-extrabold text-sky-500">{estimatedMinutes}분</span>
          </p>
        )}

        <div className="mt-6">
          <Button
            variant={isAnalysisComplete ? "default" : "disabled"}
            disabled={!isAnalysisComplete}
            onClick={() => navigate("/")}
            className="h-14 w-full rounded-none text-xl"
          >
            결과 확인하기 →
          </Button>
        </div>
      </section>
    </main>
  );
}
