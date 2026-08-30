import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  analyzeRealtimeCode,
  getStoredWcagAnalysis,
  type RealtimeIssueDetail,
} from "@/api/analysis";
import { normalizeRepositoryUrl } from "@/pages/RepositoryWorkspaceTest/utils";

import type {
  AccessibilityCategoryGroup,
  AccessibilityScoreSummary,
  ProblemFileGroup,
} from "../types";
import {
  toAccessibilityIssueGroups,
  toAccessibilityScore,
  toProblemGroups,
} from "../utils/analysisMapping";

const ANALYSIS_DEBOUNCE_MS = 1_200;
const MAX_ANALYZED_BYTES = 200 * 1024;

/** 백엔드 정적 분석 룰은 마크업 기반이라 마크업을 담는 파일만 보낸다. */
const ANALYZABLE_EXTENSIONS = [".html", ".htm", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte"];

function isAnalyzablePath(path: string | null): boolean {
  if (!path) return false;
  const lowered = path.toLowerCase();
  return ANALYZABLE_EXTENSIONS.some((extension) => lowered.endsWith(extension));
}

function readStoredAnalysisResultId(repositoryUrl: string): number | null {
  const fromQuery = new URLSearchParams(window.location.search).get("resultId");
  const queryResultId = fromQuery ? Number(fromQuery) : NaN;
  if (Number.isSafeInteger(queryResultId) && queryResultId > 0) {
    return queryResultId;
  }

  try {
    const raw = sessionStorage.getItem(`wcag-analysis:${normalizeRepositoryUrl(repositoryUrl)}`);
    const parsed = raw ? (JSON.parse(raw) as { resultId?: unknown }) : null;
    return typeof parsed?.resultId === "number" ? parsed.resultId : null;
  } catch {
    return null;
  }
}

interface UseRealtimeAnalysisParams {
  repositoryUrl: string;
  activePath: string | null;
  code: string | null;
  /** base64 등 텍스트가 아닌 파일은 분석 대상에서 제외한다. */
  encoding?: string;
}

export interface RealtimeAnalysisState {
  issues: RealtimeIssueDetail[];
  issueGroups: AccessibilityCategoryGroup[];
  score: AccessibilityScoreSummary;
  problemGroups: ProblemFileGroup[];
  analyzedPath: string | null;
  analyzedAt: string | null;
  isAnalyzing: boolean;
  isSupported: boolean;
  error: string | null;
  reanalyze: () => void;
}

export function useRealtimeAnalysis({
  repositoryUrl,
  activePath,
  code,
  encoding,
}: UseRealtimeAnalysisParams): RealtimeAnalysisState {
  const [issues, setIssues] = useState<RealtimeIssueDetail[]>([]);
  const [storedIssues, setStoredIssues] = useState<RealtimeIssueDetail[] | null>(null);
  const [analyzedPath, setAnalyzedPath] = useState<string | null>(null);
  const [analyzedCode, setAnalyzedCode] = useState("");
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingStoredAnalysis, setIsLoadingStoredAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTrigger, setManualTrigger] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const lastManualTriggerRef = useRef(manualTrigger);

  const isTextFile = encoding !== "base64";
  const isSupported = isAnalyzablePath(activePath) && isTextFile;
  const isTooLarge = (code?.length ?? 0) > MAX_ANALYZED_BYTES;

  useEffect(() => {
    if (!repositoryUrl) {
      setStoredIssues(null);
      return;
    }

    const resultId = readStoredAnalysisResultId(repositoryUrl);

    if (resultId == null) {
      setStoredIssues(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingStoredAnalysis(true);

    void getStoredWcagAnalysis(resultId, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setStoredIssues(response.issues ?? []);
        setAnalyzedAt(response.timestamp ?? new Date().toISOString());
        setError(null);
      })
      .catch((requestError) => {
        if (axios.isCancel(requestError) || controller.signal.aborted) return;
        console.warn("[WCAG] 저장된 분석 결과 조회 실패", requestError);
        setStoredIssues(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingStoredAnalysis(false);
        }
      });

    return () => controller.abort();
  }, [repositoryUrl]);

  useEffect(() => {
    if (storedIssues !== null) {
      abortRef.current?.abort();
      setIssues([]);
      setAnalyzedPath(null);
      setAnalyzedCode("");
      setIsAnalyzing(false);
      return;
    }

    if (!isSupported || !activePath || !code?.trim()) {
      abortRef.current?.abort();
      setIssues([]);
      setAnalyzedPath(null);
      setAnalyzedCode("");
      setAnalyzedAt(null);
      setIsAnalyzing(false);
      setError(null);
      return;
    }

    if (isTooLarge) {
      setIssues([]);
      setIsAnalyzing(false);
      setError(
        `파일이 너무 커서 실시간 검사를 건너뜁니다. (${Math.floor(MAX_ANALYZED_BYTES / 1024)}KB 초과)`,
      );
      return;
    }

    // 재검사 버튼은 사용자의 명시적 요청이므로 타자 디바운스를 기다리지 않는다.
    const isManualRun = lastManualTriggerRef.current !== manualTrigger;
    lastManualTriggerRef.current = manualTrigger;

    const timerId = window.setTimeout(
      async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsAnalyzing(true);
        setError(null);

        try {
          const response = await analyzeRealtimeCode(code, activePath, controller.signal);
          if (controller.signal.aborted) return;

          setIssues(response.issues ?? []);
          setAnalyzedPath(activePath);
          setAnalyzedCode(code);
          setAnalyzedAt(response.timestamp ?? new Date().toISOString());
        } catch (requestError) {
          if (axios.isCancel(requestError) || controller.signal.aborted) return;
          setIssues([]);
          setError(
            requestError instanceof Error
              ? `웹 접근성 검사에 실패했습니다: ${requestError.message}`
              : "웹 접근성 검사에 실패했습니다.",
          );
        } finally {
          if (!controller.signal.aborted) {
            setIsAnalyzing(false);
          }
        }
      },
      isManualRun ? 0 : ANALYSIS_DEBOUNCE_MS,
    );

    return () => window.clearTimeout(timerId);
  }, [activePath, code, isSupported, isTooLarge, manualTrigger, storedIssues]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // 다른 파일로 이동한 직후에는 이전 파일의 결과를 그대로 두지 않는다.
  const visibleIssues = useMemo(
    () => storedIssues ?? (analyzedPath === activePath ? issues : []),
    [analyzedPath, activePath, issues, storedIssues],
  );

  const issueGroups = useMemo(() => toAccessibilityIssueGroups(visibleIssues), [visibleIssues]);
  const score = useMemo(() => toAccessibilityScore(visibleIssues), [visibleIssues]);
  const problemGroups = useMemo(
    () => toProblemGroups(visibleIssues, analyzedPath, analyzedCode),
    [visibleIssues, analyzedPath, analyzedCode],
  );

  const reanalyze = useCallback(() => {
    setStoredIssues(null);
    setManualTrigger((count) => count + 1);
  }, []);

  return {
    issues: visibleIssues,
    issueGroups,
    score,
    problemGroups,
    analyzedPath:
      storedIssues !== null
        ? "저장된 AI 분석 결과"
        : analyzedPath === activePath
          ? analyzedPath
          : null,
    analyzedAt,
    isAnalyzing: isAnalyzing || isLoadingStoredAnalysis,
    isSupported,
    error,
    reanalyze,
  };
}
