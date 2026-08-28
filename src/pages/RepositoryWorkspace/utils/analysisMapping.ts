import type { RealtimeIssueDetail } from "@/api/analysis";

import type {
  AccessibilityCategoryGroup,
  AccessibilityIssue,
  AccessibilityScoreSummary,
  ProblemFileGroup,
  ProblemItem,
  ProblemSeverity,
  WcagLevel,
} from "../types";

type CategoryId = "visual" | "interaction" | "ux";

interface CategoryMeta {
  label: string;
  color: string;
  /** 카테고리별 만점. 세 값의 합이 100이 되도록 맞춘다. */
  maxScore: number;
}

const CATEGORY_META: Record<CategoryId, CategoryMeta> = {
  visual: { label: "시각 품질 (Visual)", color: "#22D3EE", maxScore: 34 },
  interaction: { label: "구조/동작 품질 (Interaction)", color: "#60A5FA", maxScore: 33 },
  ux: { label: "전체 경험 (UX)", color: "#3B82F6", maxScore: 33 },
};

const CATEGORY_ORDER: CategoryId[] = ["visual", "interaction", "ux"];

/** WCAG 원칙 번호(성공기준의 첫 자리)를 화면 카테고리로 옮긴다. */
const CATEGORY_BY_PRINCIPLE: Record<string, CategoryId> = {
  "1": "visual", // 인식의 용이성
  "2": "interaction", // 운용의 용이성
  "3": "ux", // 이해의 용이성
  "4": "interaction", // 견고성
};

const DEDUCTION_BY_LEVEL: Record<WcagLevel, number> = { A: 10, AA: 6, AAA: 3 };
const SEVERITY_BY_LEVEL: Record<WcagLevel, ProblemSeverity> = {
  A: "error",
  AA: "warning",
  AAA: "info",
};

export function normalizeWcagLevel(levelType: string | undefined): WcagLevel {
  const normalized = (levelType ?? "").toUpperCase();
  if (normalized.includes("AAA")) return "AAA";
  if (normalized.includes("AA")) return "AA";
  return "A";
}

function resolveCategory(sc: string | undefined): CategoryId {
  const principle = (sc ?? "").trim().charAt(0);
  return CATEGORY_BY_PRINCIPLE[principle] ?? "ux";
}

function toAccessibilityIssue(issue: RealtimeIssueDetail, index: number): AccessibilityIssue {
  const category = resolveCategory(issue.sc);
  const code = issue.sc?.trim() || `WCAG-${issue.wcagItemId}`;

  return {
    id: `${code}-${issue.wcagItemId ?? index}-${index}`,
    code,
    title: issue.title?.trim() || "제목 없는 검사 항목",
    level: normalizeWcagLevel(issue.levelType),
    // 백엔드 실시간 분석은 위반 항목만 반환하므로 모두 미해결 상태다.
    status: "pending",
    category,
    summary: issue.description?.trim() || issue.suggestion?.trim() || "상세 설명이 없습니다.",
    targetFilePath: issue.targetFilePath || undefined,
    targetSelector: issue.targetSelector || undefined,
    originalCodeBlock: issue.originalCodeBlock || undefined,
    suggestion: issue.suggestion || undefined,
    measuredValue: issue.measuredValue || undefined,
    thresholdValue: issue.thresholdValue || undefined,
  };
}

export function toAccessibilityIssueGroups(
  issues: RealtimeIssueDetail[],
): AccessibilityCategoryGroup[] {
  const mapped = issues.map(toAccessibilityIssue);

  return CATEGORY_ORDER.map((categoryId) => ({
    id: categoryId,
    label: CATEGORY_META[categoryId].label,
    legendColor: CATEGORY_META[categoryId].color,
    issues: mapped.filter((issue) => issue.category === categoryId),
  })).filter((group) => group.issues.length > 0);
}

export function toAccessibilityScore(issues: RealtimeIssueDetail[]): AccessibilityScoreSummary {
  const deductionByCategory: Record<CategoryId, number> = { visual: 0, interaction: 0, ux: 0 };

  for (const issue of issues) {
    deductionByCategory[resolveCategory(issue.sc)] +=
      DEDUCTION_BY_LEVEL[normalizeWcagLevel(issue.levelType)];
  }

  const categories = CATEGORY_ORDER.map((categoryId) => {
    const { label, color, maxScore } = CATEGORY_META[categoryId];
    return {
      id: categoryId,
      // 라벨의 괄호 표기는 상세보기 헤더용이라 도넛 범례에서는 벗겨서 쓴다.
      label: label.replace(/\s*\(.*\)$/, ""),
      color,
      score: Math.max(0, maxScore - deductionByCategory[categoryId]),
    };
  });

  return {
    totalScore: categories.reduce((sum, category) => sum + category.score, 0),
    maxScore: 100,
    categories,
  };
}

/** 코드 블록이 원본 어디에 있는지 찾아 문제 목록의 줄/열 번호를 채운다. */
function locateCodeBlock(code: string, codeBlock: string | undefined) {
  const needle = codeBlock?.split("\n")[0]?.trim();
  if (!needle) return { line: 1, column: 1 };

  const lines = code.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const column = lines[index].indexOf(needle);
    if (column !== -1) {
      return { line: index + 1, column: column + 1 };
    }
  }

  return { line: 1, column: 1 };
}

export function toProblemGroups(
  issues: RealtimeIssueDetail[],
  analyzedPath: string | null,
  code: string,
): ProblemFileGroup[] {
  const groupsByPath = new Map<string, ProblemItem[]>();

  issues.forEach((issue, index) => {
    const path = issue.targetFilePath?.trim() || analyzedPath || "알 수 없는 파일";
    const level = normalizeWcagLevel(issue.levelType);
    const { line, column } = locateCodeBlock(code, issue.originalCodeBlock);
    const selectorHint = issue.targetSelector ? ` — ${issue.targetSelector}` : "";

    const problem: ProblemItem = {
      id: `${issue.wcagItemId ?? "wcag"}-${index}`,
      severity: SEVERITY_BY_LEVEL[level],
      message: `${issue.title}${selectorHint}`,
      source: `WCAG ${issue.sc || "-"}`,
      line,
      column,
    };

    const existing = groupsByPath.get(path);
    if (existing) {
      existing.push(problem);
    } else {
      groupsByPath.set(path, [problem]);
    }
  });

  return [...groupsByPath.entries()].map(([path, problems]) => ({ path, problems }));
}

export function findIssueInGroups(
  groups: AccessibilityCategoryGroup[],
  issueId: string | null,
): AccessibilityIssue | null {
  if (!issueId) return null;

  for (const group of groups) {
    const issue = group.issues.find((item) => item.id === issueId);
    if (issue) return issue;
  }

  return null;
}
