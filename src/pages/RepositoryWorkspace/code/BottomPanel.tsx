import { useMemo, useState } from "react";

import type { BottomPanelTab, ProblemFileGroup } from "../types";
import { countProblemsBySeverity, PROBLEM_GROUPS } from "./codeWorkspace";
import GitDiffPanel from "./GitDiffPanel";
import { CloseIcon, FilterIcon, MaximizeIcon, MinimizeIcon, SeverityIcon } from "./icons";
import ProblemsList from "./ProblemsList";

interface BottomPanelProps {
  runtimeLog: string[];
  runtimeError: string | null;
  loadError: string | null;
  isRestarting: boolean;
  onSelectProblem: (path: string) => void | Promise<void>;
  onRestartPreview: () => void | Promise<void>;
  /** 실시간 접근성 분석 결과. 없으면 목업 문제 목록을 보여준다. */
  problemGroups?: ProblemFileGroup[];
  isAnalyzing?: boolean;
  analysisError?: string | null;
  /** Git diff 탭 데이터. diffPath가 undefined면 탭 자체를 숨긴다. */
  diffPath?: string | null;
  diff?: string | null;
  isDiffLoading?: boolean;
}

const BASE_TABS: { id: BottomPanelTab; label: string }[] = [
  { id: "problems", label: "PROBLEMS" },
  { id: "output", label: "OUTPUT" },
  { id: "debug", label: "DEBUG CONSOLE" },
  { id: "terminal", label: "TERMINAL" },
];

export default function BottomPanel({
  runtimeLog,
  runtimeError,
  loadError,
  isRestarting,
  onSelectProblem,
  onRestartPreview,
  problemGroups,
  isAnalyzing = false,
  analysisError = null,
  diffPath,
  diff = null,
  isDiffLoading = false,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("problems");
  const [filter, setFilter] = useState("");
  /** true면 탭 바만 보이고 내용 영역은 접힘 */
  const [isCollapsed, setIsCollapsed] = useState(false);
  /** true면 기본 높이 대신 패널을 크게 표시 */
  const [isExpanded, setIsExpanded] = useState(false);
  /** true면 패널 전체를 숨김(다시 열기 막대만 표시) */
  const [isHidden, setIsHidden] = useState(false);

  const openPanel = (tab?: BottomPanelTab) => {
    setIsHidden(false);
    setIsCollapsed(false);
    if (tab) setActiveTab(tab);
  };

  const isGitDiffEnabled = diffPath !== undefined;
  const groups = problemGroups ?? PROBLEM_GROUPS;

  const tabs = useMemo(
    () =>
      isGitDiffEnabled
        ? [BASE_TABS[0], { id: "gitDiff" as const, label: "GIT DIFF" }, ...BASE_TABS.slice(1)]
        : BASE_TABS,
    [isGitDiffEnabled],
  );

  const severityCounts = useMemo(() => countProblemsBySeverity(groups), [groups]);

  const filteredGroups = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return groups;

    return groups
      .map((group) => ({
        ...group,
        problems: group.problems.filter(
          (problem) =>
            problem.message.toLowerCase().includes(keyword) ||
            group.path.toLowerCase().includes(keyword),
        ),
      }))
      .filter((group) => group.problems.length > 0);
  }, [filter, groups]);

  const logLines = runtimeLog.length > 0 ? runtimeLog.slice(-200) : [];

  const panelHeightClass = isCollapsed ? "h-9" : isExpanded ? "h-[60%]" : "h-56";

  const reopenQuickTabs = tabs.filter((tab) =>
    ["problems", "output", "terminal"].includes(tab.id),
  );

  if (isHidden) {
    return (
      <section
        className="flex h-7 shrink-0 items-center gap-3 border-t border-slate-200 bg-[#FAFAFC] px-3"
        aria-label="하단 패널 다시 열기"
      >
        <button
          type="button"
          onClick={() => openPanel()}
          className="cursor-pointer text-[10px] font-bold tracking-[0.04em] text-[#7b8494] hover:text-point"
        >
          패널 열기
        </button>
        <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
        <div className="flex items-center gap-3">
          {reopenQuickTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => openPanel(tab.id)}
              className="cursor-pointer text-[10px] font-bold tracking-[0.04em] text-[#7b8494] hover:text-point"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "flex shrink-0 flex-col border-t border-slate-200 bg-white",
        panelHeightClass,
      ].join(" ")}
      aria-label="문제 및 출력 패널"
    >
      <div className="flex h-9 shrink-0 items-center gap-4 border-b border-slate-200 bg-[#FAFAFC] px-3">
        <div className="flex items-center gap-4" role="tablist" aria-label="하단 패널 탭">
          {tabs.map((tab) => {
            const isActive = !isCollapsed && activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isCollapsed) {
                    setIsCollapsed(false);
                  }
                }}
                className={[
                  "flex items-center gap-1.5 border-b-2 py-2 text-[10px] font-bold tracking-[0.04em]",
                  isActive
                    ? "border-point text-point"
                    : "border-transparent text-[#7b8494] hover:text-slate-700",
                ].join(" ")}
              >
                {tab.label}
                {tab.id === "problems" && (
                  <span className="flex items-center gap-1">
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                      <SeverityIcon severity="error" />
                      {severityCounts.error}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                      <SeverityIcon severity="warning" />
                      {severityCounts.warning}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                      <SeverityIcon severity="info" />
                      {severityCounts.info}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="relative hidden items-center md:flex">
            <span className="sr-only">문제 필터</span>
            <FilterIcon className="absolute left-2 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter (e.g. text, **/*.ts, !**/node_modules/**)"
              className="h-6 w-64 rounded border border-slate-200 bg-white pr-2 pl-6 text-[10px] font-medium text-slate-600 placeholder:text-slate-300 focus:border-point-400 focus:outline-none"
            />
          </label>

          <button
            type="button"
            aria-label={isCollapsed ? "패널 펼치기" : "패널 최소화"}
            onClick={() => {
              if (isCollapsed) {
                setIsCollapsed(false);
                return;
              }
              setIsCollapsed(true);
              setIsExpanded(false);
            }}
            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            aria-label={isExpanded ? "패널 기본 크기" : "패널 최대화"}
            disabled={isCollapsed}
            onClick={() => {
              setIsExpanded((prev) => !prev);
              setIsCollapsed(false);
            }}
            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MaximizeIcon />
          </button>
          <button
            type="button"
            aria-label="패널 닫기"
            onClick={() => {
              setIsHidden(true);
              setIsCollapsed(false);
              setIsExpanded(false);
            }}
            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
          {activeTab === "problems" && (
            <>
              {analysisError && (
                <p className="border-b border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-600">
                  {analysisError}
                </p>
              )}
              {isAnalyzing && (
                <p className="px-3 py-1.5 text-[11px] font-medium text-point-500">
                  웹 접근성 검사 중...
                </p>
              )}
              <ProblemsList groups={filteredGroups} onSelectProblem={onSelectProblem} />
            </>
          )}

          {activeTab === "gitDiff" && (
            <GitDiffPanel path={diffPath ?? null} diff={diff} isLoading={isDiffLoading} />
          )}

          {activeTab === "output" && (
            <div className="px-3 py-2 font-mono text-[11px] leading-5 text-slate-600">
              {loadError && <p className="text-rose-500">{loadError}</p>}
              {runtimeError && <p className="text-rose-500">{runtimeError}</p>}
              {logLines.length === 0 && !loadError && !runtimeError ? (
                <p className="font-sans text-slate-400">출력 내용이 없습니다.</p>
              ) : (
                logLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
              )}
            </div>
          )}

          {activeTab === "debug" && (
            <p className="px-3 py-2 text-[11px] font-medium text-slate-400">
              디버그 세션이 실행 중이 아닙니다.
            </p>
          )}

          {activeTab === "terminal" && (
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  void onRestartPreview();
                }}
                disabled={isRestarting}
                className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {isRestarting ? "재시작 중" : "프리뷰 재시작"}
              </button>

              <div className="mt-2 font-mono text-[11px] leading-5 text-slate-600">
                {logLines.length === 0 ? (
                  <p className="font-sans text-slate-400">터미널 로그가 없습니다.</p>
                ) : (
                  logLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
