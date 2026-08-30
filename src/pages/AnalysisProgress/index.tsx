import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "@/components/Button";
import { type RepositoryTreeResponse } from "@/api/repository";
import { runAnalysisSnapshotPipeline } from "@/preview-capture/runAnalysisSnapshotPipeline";
import { prewarmWebContainer } from "@/utils/webContainerRuntime";
import { getOrStartWorkspaceWarmup } from "@/utils/workspaceWarmup";

type StepStatus = "pending" | "running" | "done" | "error";

interface AnalysisStep {
  title: string;
  icon: string;
}

const STEPS: AnalysisStep[] = [
  {
    title: "파일 구조 파악",
    icon: "🗂️",
  },
  {
    title: "코드 파싱",
    icon: "💻",
  },
  {
    title: "렌더링 스냅샷",
    icon: "🖼️",
  },
  {
    title: "AI 분석",
    icon: "🤖",
  },
];

function setStep(statuses: StepStatus[], index: number, status: StepStatus): StepStatus[] {
  const next = [...statuses];
  next[index] = status;
  return next;
}

export default function AnalysisProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositoryUrl = searchParams.get("repo") ?? "";
  const branchName = searchParams.get("branch") ?? "";

  const [tree, setTree] = useState<RepositoryTreeResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(STEPS.map(() => "pending"));
  const [stepMessages, setStepMessages] = useState<string[]>(STEPS.map(() => "대기 중"));
  const [isComplete, setIsComplete] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [snapshotImageUrl, setSnapshotImageUrl] = useState<string | null>(null);
  const [analysisResultId, setAnalysisResultId] = useState<number | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const initialized = useRef(false);

  const progress = useMemo(() => {
    const doneCount = stepStatuses.filter((status) => status === "done").length;
    if (isComplete) return 100;
    return Math.round((doneCount / STEPS.length) * 100);
  }, [stepStatuses, isComplete]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!repositoryUrl) return;

    void getOrStartWorkspaceWarmup(repositoryUrl, branchName);
    void prewarmWebContainer();

    const runSteps = async () => {
      setStepStatuses((prev) => setStep(prev, 0, "running"));
      setStepMessages((prev) => {
        const next = [...prev];
        next[0] = "진행 중…";
        return next;
      });

      let warmed: Awaited<ReturnType<typeof getOrStartWorkspaceWarmup>> | undefined;
      try {
        warmed = await getOrStartWorkspaceWarmup(repositoryUrl, branchName);
        setTree(warmed.tree);
        const fileCount = warmed.tree.nodes.filter((n) => n.type === "blob").length;
        setStepMessages((prev) => {
          const next = [...prev];
          next[0] = `${fileCount}개 파일 완료`;
          return next;
        });
      } catch {
        setFetchError(true);
        setStepMessages((prev) => {
          const next = [...prev];
          next[0] = "트리 조회 실패 (계속 진행)";
          return next;
        });
      }

      setStepStatuses((prev) => setStep(prev, 0, "done"));

      setCurrentStep(1);
      setStepStatuses((prev) => setStep(prev, 1, "running"));
      setStepMessages((prev) => {
        const next = [...prev];
        next[1] = "진행 중…";
        return next;
      });

      const tsxCount =
        warmed?.tree.nodes.filter(
          (node) => node.path.endsWith(".tsx") || node.path.endsWith(".jsx"),
        ).length ?? 0;
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      setStepMessages((prev) => {
        const next = [...prev];
        next[1] = `${tsxCount}개 컴포넌트 완료`;
        return next;
      });
      setStepStatuses((prev) => setStep(prev, 1, "done"));

      setCurrentStep(2);
      setStepStatuses((prev) => setStep(prev, 2, "running"));
      setStepMessages((prev) => {
        const next = [...prev];
        next[2] = "프리뷰 렌더링 준비 중…";
        return next;
      });

      if (!warmed || Object.keys(warmed.files).length === 0) {
        setStepStatuses((prev) => setStep(prev, 2, "error"));
        setStepMessages((prev) => {
          const next = [...prev];
          next[2] = "스냅샷용 파일이 없습니다";
          return next;
        });
        setPipelineError("저장소 파일을 불러오지 못해 스냅샷을 생성할 수 없습니다.");
        setIsComplete(true);
        return;
      }

      try {
        const result = await runAnalysisSnapshotPipeline({
          repositoryUrl,
          branchName: (warmed.tree.branch ?? branchName) || "HEAD",
          tree: warmed.tree,
          files: warmed.files,
          onProgress: (message) => {
            console.log("[렌더링 스냅샷][UI]", message);
            setStepMessages((prev) => {
              const next = [...prev];
              if (prev[2] !== "done" && prev[3] !== "running" && prev[3] !== "done") {
                next[2] = message;
              } else if (prev[3] === "running") {
                next[3] = message;
              }
              return next;
            });

            if (message.includes("백엔드로 전송")) {
              setCurrentStep(3);
              setStepStatuses((prev) => {
                const next = setStep(prev, 2, "done");
                return setStep(next, 3, "running");
              });
              setStepMessages((prev) => {
                const next = [...prev];
                next[2] = "스냅샷 완료";
                next[3] = message;
                return next;
              });
            }
          },
        });

        setSnapshotImageUrl(result.imageObjectUrl);
        setAnalysisResultId(result.resultId);
        console.log("[렌더링 스냅샷][UI] 파이프라인 성공", {
          resultId: result.resultId,
          snapshotId: result.snapshotId,
          previewUrl: result.previewUrl,
          renderedFilePaths: result.renderedFilePaths,
        });
        sessionStorage.setItem(
          `wcag-analysis:${repositoryUrl}`,
          JSON.stringify({
            resultId: result.resultId,
            snapshotId: result.snapshotId,
            imageObjectUrl: result.imageObjectUrl,
          }),
        );

        setStepStatuses((prev) => {
          const next = setStep(prev, 2, "done");
          return setStep(next, 3, "done");
        });
        setStepMessages((prev) => {
          const next = [...prev];
          next[2] = "스냅샷 완료";
          next[3] = `분석 완료 (resultId: ${result.resultId})`;
          return next;
        });
        setCurrentStep(3);
        setIsComplete(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[렌더링 스냅샷][UI] 파이프라인 실패", error);
        setPipelineError(message);
        setStepStatuses((prev) => {
          const next = [...prev];
          if (next[3] === "running") {
            next[3] = "error";
          } else {
            next[2] = "error";
          }
          return next;
        });
        setStepMessages((prev) => {
          const next = [...prev];
          if (next[3] === "진행 중…" || next[3]?.includes("전송")) {
            next[3] = "분석 실패";
          } else {
            next[2] = "스냅샷 실패";
          }
          return next;
        });
        setIsComplete(true);
      }
    };

    void runSteps();
  }, [repositoryUrl, branchName]);

  useEffect(() => {
    return () => {
      if (snapshotImageUrl) {
        URL.revokeObjectURL(snapshotImageUrl);
      }
    };
  }, [snapshotImageUrl]);

  const displayName = useMemo(() => {
    if (tree) return `${tree.owner}/${tree.repo}`;
    try {
      const url = new URL(repositoryUrl);
      return url.pathname.replace(/^\//, "");
    } catch {
      return repositoryUrl;
    }
  }, [tree, repositoryUrl]);

  const workspaceUrl = `/repository-workspace?repo=${encodeURIComponent(repositoryUrl)}&branch=${encodeURIComponent(branchName)}`;

  return (
    <main className="flex min-h-screen items-center bg-white px-6 py-10 md:px-10">
      <section className="mx-auto w-full max-w-5xl -translate-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">저장소 분석</h1>
        <p className="mt-2 text-xl font-semibold text-slate-600">
          {displayName} {branchName && <span className="text-sky-600">({branchName})</span>}
        </p>

        {fetchError && (
          <p className="mt-3 text-sm font-medium text-amber-600">
            저장소 트리를 불러오지 못했습니다. API 서버 상태와 브랜치 이름을 확인해 주세요.
          </p>
        )}

        {pipelineError && (
          <p className="mt-3 text-sm font-medium text-rose-600">
            스냅샷/분석 오류: {pipelineError}
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
                      {stepMessages[index]}
                    </span>
                  </span>
                </div>

                {status === "done" ? (
                  <span className="text-xl font-extrabold text-green-600">완료</span>
                ) : status === "error" ? (
                  <span className="text-xl font-extrabold text-rose-600">실패</span>
                ) : isActive ? (
                  <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
                ) : (
                  <span className="h-8 w-8 rounded-full border-4 border-slate-100" />
                )}
              </li>
            );
          })}
        </ul>

        {snapshotImageUrl && (
          <div className="mt-6 border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <strong className="text-sm font-extrabold text-slate-800">
                전송된 렌더링 스냅샷
              </strong>
              {analysisResultId != null && (
                <span className="text-xs font-semibold text-sky-600">
                  resultId: {analysisResultId}
                </span>
              )}
            </div>
            <img
              src={snapshotImageUrl}
              alt="Captured repository preview snapshot"
              className="max-h-80 w-full border border-slate-200 bg-white object-contain"
            />
          </div>
        )}

        <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-4 text-xl font-semibold text-slate-700">
          {isComplete ? "분석 준비가 완료되었습니다." : "분석 진행 중"}{" "}
          <span className="font-extrabold text-sky-500">{progress}%</span>
        </p>

        <div className="mt-6">
          <Button
            variant={isComplete ? "default" : "disabled"}
            disabled={!isComplete}
            onClick={() => navigate(workspaceUrl)}
            className="h-14 w-full rounded-none text-xl"
          >
            결과 확인하기
          </Button>
        </div>
      </section>
    </main>
  );
}
