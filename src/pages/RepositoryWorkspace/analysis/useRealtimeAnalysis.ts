import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getStoredWcagAnalysis,
  type RealtimeIssueDetail,
} from "@/api/analysis";
import { captureAndUploadWorkspaceSnapshots } from "@/preview-capture/captureAndUploadWorkspaceSnapshots";
import type { PreviewRuntimeKind } from "@/workspace/previewProject";
import type { LoadedFile, PreviewStatus } from "@/workspace/types";
import { normalizeRepositoryUrl } from "@/workspace/workspaceUtils";

import type {
  AccessibilityCategoryGroup,
  AccessibilityScoreSummary,
  ProblemFileGroup,
} from "../types";
import {
  toAccessibilityIssueGroups,
  toAccessibilityScore,
  toProblemGroups,
} from "./analysisMapping";

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

function persistAnalysisResultId(
  repositoryUrl: string,
  resultId: number,
  snapshotId: string,
) {
  sessionStorage.setItem(
    `wcag-analysis:${normalizeRepositoryUrl(repositoryUrl)}`,
    JSON.stringify({ resultId, snapshotId }),
  );

  const url = new URL(window.location.href);
  url.searchParams.set("resultId", String(resultId));
  window.history.replaceState(window.history.state, "", url.toString());
}

interface UseRealtimeAnalysisParams {
  repositoryUrl: string;
  branchName: string;
  previewUrl: string;
  previewStatus: PreviewStatus;
  filesByPath: Record<string, LoadedFile>;
  previewRuntimeKind: PreviewRuntimeKind;
  previewEntryPath: string | null;
  /** 사용자 코드 수정이 발생할 때마다 증가하는 세대. 재검사 활성화를 판단한다. */
  contentEditGeneration?: number;
  onFlushPendingWrites: () => Promise<void>;
  setShowErrors: (value: boolean | ((current: boolean) => boolean)) => void;
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
  hasPendingEdits: boolean;
  canReaudit: boolean;
  error: string | null;
  reanalyze: () => void;
}

export function useRealtimeAnalysis({
  repositoryUrl,
  branchName,
  previewUrl,
  previewStatus,
  filesByPath,
  previewRuntimeKind,
  previewEntryPath,
  contentEditGeneration = 0,
  onFlushPendingWrites,
  setShowErrors,
}: UseRealtimeAnalysisParams): RealtimeAnalysisState {
  const [storedIssues, setStoredIssues] = useState<RealtimeIssueDetail[] | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [analyzedEditGeneration, setAnalyzedEditGeneration] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingStoredAnalysis, setIsLoadingStoredAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const contentEditGenerationRef = useRef(contentEditGeneration);
  contentEditGenerationRef.current = contentEditGeneration;
  const showErrorsBeforeCaptureRef = useRef(true);

  const previewReady = previewStatus === "ready" && Boolean(previewUrl.trim());
  const hasPendingEdits =
    analyzedEditGeneration === null
      ? !isLoadingStoredAnalysis && storedIssues === null
      : contentEditGeneration > analyzedEditGeneration;
  const canReaudit =
    previewReady && !isAnalyzing && !isLoadingStoredAnalysis && hasPendingEdits;

  useEffect(() => {
    if (!repositoryUrl) {
      setStoredIssues(null);
      setAnalyzedEditGeneration(null);
      return;
    }

    const resultId = readStoredAnalysisResultId(repositoryUrl);

    if (resultId == null) {
      setStoredIssues(null);
      return;
    }

    const controller = new AbortController();
    const generationAtStart = contentEditGenerationRef.current;
    setIsLoadingStoredAnalysis(true);

    void getStoredWcagAnalysis(resultId, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setStoredIssues(response.issues ?? []);
        setAnalyzedAt(response.timestamp ?? new Date().toISOString());
        setAnalyzedEditGeneration(generationAtStart);
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

  useEffect(() => () => abortRef.current?.abort(), []);

  const visibleIssues = useMemo(() => storedIssues ?? [], [storedIssues]);

  const issueGroups = useMemo(() => toAccessibilityIssueGroups(visibleIssues), [visibleIssues]);
  const score = useMemo(() => toAccessibilityScore(visibleIssues), [visibleIssues]);
  const problemGroups = useMemo(
    () => toProblemGroups(visibleIssues, "전체 저장소 분석 결과", ""),
    [visibleIssues],
  );

  const reanalyze = useCallback(() => {
    if (isAnalyzing || isLoadingStoredAnalysis) return;

    void (async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const generationAtStart = contentEditGenerationRef.current;
      setIsAnalyzing(true);
      setError(null);

      setShowErrors((current) => {
        showErrorsBeforeCaptureRef.current = current;
        return false;
      });

      try {
        await onFlushPendingWrites();
        if (controller.signal.aborted) return;

        if (previewStatus !== "ready" || !previewUrl.trim()) {
          throw new Error("프리뷰가 준비된 뒤 재검사할 수 있습니다.");
        }

        const uploadResult = await captureAndUploadWorkspaceSnapshots({
          repositoryUrl,
          branchName,
          previewUrl,
          filesByPath,
          previewRuntimeKind,
          previewEntryPath,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        persistAnalysisResultId(repositoryUrl, uploadResult.resultId, uploadResult.snapshotId);

        const response = await getStoredWcagAnalysis(uploadResult.resultId, controller.signal);
        if (controller.signal.aborted) return;

        setStoredIssues(response.issues ?? []);
        setAnalyzedAt(response.timestamp ?? new Date().toISOString());
        setAnalyzedEditGeneration(generationAtStart);
      } catch (requestError) {
        if (axios.isCancel(requestError) || controller.signal.aborted) return;
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(
          requestError instanceof Error
            ? `웹 접근성 재검사에 실패했습니다: ${requestError.message}`
            : "웹 접근성 재검사에 실패했습니다.",
        );
      } finally {
        setShowErrors(showErrorsBeforeCaptureRef.current);
        setIsAnalyzing(false);
      }
    })();
  }, [
    branchName,
    filesByPath,
    isAnalyzing,
    isLoadingStoredAnalysis,
    onFlushPendingWrites,
    previewEntryPath,
    previewRuntimeKind,
    previewStatus,
    previewUrl,
    repositoryUrl,
    setShowErrors,
  ]);

  return {
    issues: visibleIssues,
    issueGroups,
    score,
    problemGroups,
    analyzedPath: storedIssues !== null ? "전체 저장소 분석 결과" : null,
    analyzedAt,
    isAnalyzing: isAnalyzing || isLoadingStoredAnalysis,
    isSupported: previewReady,
    hasPendingEdits,
    canReaudit,
    error,
    reanalyze,
  };
}
