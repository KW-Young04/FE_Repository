import axios from "axios";
import { useCallback, useRef, useState } from "react";

import { applyCodeFixes, generateCodeFixes, type CodeFixItem } from "@/api/analysis";

import type { AccessibilityIssue } from "../types";
import { readStoredAnalysisResultId } from "./useRealtimeAnalysis";

interface UseAiCodeFixOptions {
  repositoryUrl: string;
  branchName: string;
  onFlushPendingWrites: () => Promise<void>;
  onApplyExternalContent: (path: string, content: string) => Promise<void>;
}

export interface AiCodeFixController {
  canFix: (issue: AccessibilityIssue) => boolean;
  isApplied: (issue: AccessibilityIssue) => boolean;
  generate: (issue: AccessibilityIssue) => Promise<CodeFixItem>;
  apply: (issue: AccessibilityIssue) => Promise<void>;
}

/** 이전에 생성되어 DB에 저장된 수정안이 있으면 AI를 다시 호출하지 않고 사용한다. */
function parseStoredFix(issue: AccessibilityIssue): CodeFixItem | null {
  if (issue.suggestionType !== "CODE_FIX" || !issue.suggestionDetail || issue.locationId == null) {
    return null;
  }
  try {
    const detail = JSON.parse(issue.suggestionDetail) as { before?: unknown; after?: unknown };
    if (typeof detail.before !== "string" || typeof detail.after !== "string") return null;
    return {
      locationId: issue.locationId,
      sc: null,
      status: "READY",
      before: detail.before,
      after: detail.after,
      failReason: null,
    };
  } catch {
    return null;
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === "string" && message) return message;
    if (error.code === "ECONNABORTED")
      return "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useAiCodeFix({
  repositoryUrl,
  branchName,
  onFlushPendingWrites,
  onApplyExternalContent,
}: UseAiCodeFixOptions): AiCodeFixController {
  // 파일 단위 캐시: 같은 파일의 다른 이슈를 열 때 AI를 다시 호출하지 않는다.
  const fixesByFileRef = useRef(new Map<string, Map<number, CodeFixItem>>());
  const [appliedIds, setAppliedIds] = useState<Set<number>>(() => new Set());

  const canFix = useCallback(
    (issue: AccessibilityIssue) =>
      Boolean(repositoryUrl && branchName && issue.locationId != null && issue.targetFilePath),
    [branchName, repositoryUrl],
  );

  const isApplied = useCallback(
    (issue: AccessibilityIssue) =>
      issue.status === "in_progress" ||
      (issue.locationId != null && appliedIds.has(issue.locationId)),
    [appliedIds],
  );

  const resolveRepositoryId = useCallback(() => {
    const repositoryId = readStoredAnalysisResultId(repositoryUrl);
    if (repositoryId == null) {
      throw new Error("저장된 분석 결과가 없습니다. 먼저 분석을 실행해 주세요.");
    }
    return repositoryId;
  }, [repositoryUrl]);

  const generate = useCallback(
    async (issue: AccessibilityIssue): Promise<CodeFixItem> => {
      if (!canFix(issue)) throw new Error("저장된 분석 결과의 이슈만 AI 수정을 지원합니다.");
      const locationId = issue.locationId as number;
      const filePath = issue.targetFilePath as string;

      const cached = fixesByFileRef.current.get(filePath)?.get(locationId);
      if (cached?.status === "READY") return cached;
      const stored = parseStoredFix(issue);
      if (stored) return stored;

      try {
        const repositoryId = resolveRepositoryId();
        await onFlushPendingWrites();
        const response = await generateCodeFixes(repositoryId, {
          repositoryUrl,
          branchName,
          filePath,
        });
        const byId = new Map(response.fixes.map((fix) => [fix.locationId, fix]));
        fixesByFileRef.current.set(filePath, byId);

        const fix = byId.get(locationId);
        if (!fix) {
          throw new Error("이 위치는 수정 대상이 아닙니다. 이미 적용되었거나 재분석이 필요합니다.");
        }
        return fix;
      } catch (error) {
        throw new Error(toErrorMessage(error, "AI 수정안을 생성하지 못했습니다."));
      }
    },
    [branchName, canFix, onFlushPendingWrites, repositoryUrl, resolveRepositoryId],
  );

  const apply = useCallback(
    async (issue: AccessibilityIssue): Promise<void> => {
      if (!canFix(issue)) throw new Error("저장된 분석 결과의 이슈만 AI 수정을 지원합니다.");
      const locationId = issue.locationId as number;
      const filePath = issue.targetFilePath as string;

      try {
        const repositoryId = resolveRepositoryId();
        await onFlushPendingWrites();
        const response = await applyCodeFixes(repositoryId, {
          repositoryUrl,
          branchName,
          filePath,
          locationIds: [locationId],
        });

        fixesByFileRef.current.get(filePath)?.delete(locationId);

        if (!response.appliedLocationIds.includes(locationId)) {
          const reason = response.failed.find((fix) => fix.locationId === locationId)?.failReason;
          throw new Error(reason ?? "수정안을 적용하지 못했습니다.");
        }

        await onApplyExternalContent(filePath, response.content);
        setAppliedIds((prev) => new Set(prev).add(locationId));
      } catch (error) {
        throw new Error(toErrorMessage(error, "수정안을 적용하지 못했습니다."));
      }
    },
    [
      branchName,
      canFix,
      onApplyExternalContent,
      onFlushPendingWrites,
      repositoryUrl,
      resolveRepositoryId,
    ],
  );

  return { canFix, isApplied, generate, apply };
}
