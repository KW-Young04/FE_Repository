import { useMemo, useState } from "react";

import { countProblemsBySeverity, PROBLEM_GROUPS } from "../../data/codeWorkspace";
import type { BottomPanelTab } from "../../types";
import { CloseIcon, FilterIcon, MaximizeIcon, MinimizeIcon, SeverityIcon } from "./icons";
import ProblemsList from "./ProblemsList";

interface BottomPanelProps {
  runtimeLog: string[];
  runtimeError: string | null;
  loadError: string | null;
  isRestarting: boolean;
  onSelectProblem: (path: string) => void | Promise<void>;
  onRestartPreview: () => void | Promise<void>;
}

const PANEL_TABS: { id: BottomPanelTab; label: string }[] = [
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
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("problems");
  const [filter, setFilter] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const severityCounts = useMemo(() => countProblemsBySeverity(PROBLEM_GROUPS), []);

  const filteredGroups = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    if (!keyword) return PROBLEM_GROUPS;

    return PROBLEM_GROUPS.map((group) => ({
      ...group,
      problems: group.problems.filter(
        (problem) =>
          problem.message.toLowerCase().includes(keyword) ||
          group.path.toLowerCase().includes(keyword),
      ),
    })).filter((group) => group.problems.length > 0);
  }, [filter]);

  const logLines = runtimeLog.length > 0 ? runtimeLog.slice(-200) : [];

  return (
    <section
      className={[
        "flex shrink-0 flex-col border-t border-slate-200 bg-white",
        isCollapsed ? "h-9" : isExpanded ? "h-[60%]" : "h-56",
      ].join(" ")}
      aria-label="문제 및 출력 패널"
    >
      <div className="flex h-9 shrink-0 items-center gap-4 border-b border-slate-200 bg-[#FAFAFC] px-3">
        <div className="flex items-center gap-4" role="tablist" aria-label="하단 패널 탭">
          {PANEL_TABS.map((tab) => {
            const isActive = !isCollapsed && activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsCollapsed(false);
                }}
                className={[
                  "flex items-center gap-1.5 border-b-2 py-2 text-[10px] font-bold tracking-[0.04em]",
                  isActive
                    ? "border-violet-500 text-violet-600"
                    : "border-transparent text-slate-500 hover:text-slate-700",
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
              className="h-6 w-64 rounded border border-slate-200 bg-white pr-2 pl-6 text-[10px] font-medium text-slate-600 placeholder:text-slate-300 focus:border-violet-400 focus:outline-none"
            />
          </label>

          <button
            type="button"
            aria-label={isCollapsed ? "패널 펼치기" : "패널 접기"}
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            aria-label={isExpanded ? "패널 기본 크기" : "패널 최대화"}
            onClick={() => {
              setIsExpanded((prev) => !prev);
              setIsCollapsed(false);
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
          >
            <MaximizeIcon />
          </button>
          <button
            type="button"
            aria-label="패널 닫기"
            onClick={() => setIsCollapsed(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
          {activeTab === "problems" && (
            <ProblemsList groups={filteredGroups} onSelectProblem={onSelectProblem} />
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
