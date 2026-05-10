import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Button";
import { repositoryApi, type RepositoryTreeResponse } from "@/api/repository";

type StepStatus = "pending" | "running" | "done";

interface AnalysisStep {
  title: string;
  icon: string;
  description: (tree: RepositoryTreeResponse | null) => string;
}

const STEPS: AnalysisStep[] = [
  {
    title: "파일 구조 파악",
    icon: "🗂️",
    description: (tree) => {
      if (!tree) return "분석 중…";
      const fileCount = tree.nodes.filter((n) => n.type === "blob").length;
      return `${fileCount}개 파일 완료`;
    },
  },
  {
    title: "코드 파싱",
    icon: "💻",
    description: (tree) => {
      if (!tree) return "분석 중…";
      const tsxCount = tree.nodes.filter((n) => n.path.endsWith(".tsx") || n.path.endsWith(".jsx")).length;
      return `${tsxCount}개 컴포넌트 완료`;
    },
  },
  {
    title: "렌더링 스냅샷",
    icon: "🖼️",
    description: () => "스냅샷 완료",
  },
  {
    title: "AI 분석",
    icon: "🤖",
    description: () => "분석 완료",
  },
];

const STEP_DURATION_MS = 2000;

export default function AnalysisProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositoryUrl = searchParams.get("repo") ?? "";

  const [tree, setTree] = useState<RepositoryTreeResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    STEPS.map(() => "pending"),
  );
  const [isComplete, setIsComplete] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const initialized = useRef(false);

  const progress = useMemo(() => {
    const doneCount = stepStatuses.filter((s) => s === "done").length;
    if (isComplete) return 100;
    return Math.round((doneCount / STEPS.length) * 100);
  }, [stepStatuses, isComplete]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!repositoryUrl) return;

    const runSteps = async () => {
      setStepStatuses((prev) => {
        const next = [...prev];
        next[0] = "running";
        return next;
      });

      try {
        const treeData = await repositoryApi.getTree(repositoryUrl);
        setTree(treeData);
      } catch {
        setFetchError(true);
      }

      setStepStatuses((prev) => {
        const next = [...prev];
        next[0] = "done";
        return next;
      });

      for (let i = 1; i < STEPS.length; i++) {
        setCurrentStep(i);
        setStepStatuses((prev) => {
          const next = [...prev];
          next[i] = "running";
          return next;
        });

        await new Promise((resolve) => setTimeout(resolve, STEP_DURATION_MS));

        setStepStatuses((prev) => {
          const next = [...prev];
          next[i] = "done";
          return next;
        });
      }

      setIsComplete(true);
    };

    runSteps();
  }, [repositoryUrl]);

  const displayName = useMemo(() => {
    if (tree) return `${tree.owner}/${tree.repo}`;
    try {
      const url = new URL(repositoryUrl);
      return url.pathname.replace(/^\//, "");
    } catch {
      return repositoryUrl;
    }
  }, [tree, repositoryUrl]);

  return (
    <main className="flex min-h-screen items-center bg-white px-6 py-10 md:px-10">
      <section className="mx-auto w-full max-w-5xl -translate-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">저장소 분석</h1>
        <p className="mt-2 text-xl font-semibold text-slate-600">{displayName}</p>

        {fetchError && (
          <p className="mt-3 text-sm font-medium text-amber-600">
            저장소 트리를 불러오지 못했습니다. 분석은 계속 진행됩니다.
          </p>
        )}

        <ul className="mt-8 space-y-4">
          {STEPS.map((step, index) => {
            const status = stepStatuses[index];
            const isActive = currentStep === index && status === "running";

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
                      {status === "done"
                        ? step.description(tree)
                        : isActive
                          ? "진행 중…"
                          : "대기 중"}
                    </span>
                  </span>
                </div>

                {status === "done" ? (
                  <span className="text-xl font-extrabold text-green-600">완료</span>
                ) : isActive ? (
                  <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
                ) : (
                  <span className="h-8 w-8 rounded-full border-4 border-slate-100" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {isComplete ? (
          <p className="mt-4 text-xl font-extrabold text-slate-800">분석이 완료되었습니다!</p>
        ) : (
          <p className="mt-4 text-xl font-semibold text-slate-700">
            분석 진행 중…{" "}
            <span className="font-extrabold text-sky-500">{progress}%</span>
          </p>
        )}

        <div className="mt-6">
          <Button
            variant={isComplete ? "default" : "disabled"}
            disabled={!isComplete}
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
