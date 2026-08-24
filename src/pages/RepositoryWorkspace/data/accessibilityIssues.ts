import type { AccessibilityCategoryGroup, AccessibilityScoreSummary } from "../types";

export const ACCESSIBILITY_SCORE: AccessibilityScoreSummary = {
  totalScore: 60,
  maxScore: 100,
  categories: [
    { id: "visual", label: "시각 품질", color: "#22D3EE", score: 22 },
    { id: "interaction", label: "구조/동작 품질", color: "#60A5FA", score: 20 },
    { id: "ux", label: "전체 경험", color: "#3B82F6", score: 18 },
  ],
};

export const ACCESSIBILITY_ISSUE_GROUPS: AccessibilityCategoryGroup[] = [
  {
    id: "visual",
    label: "시각 품질 (Visual)",
    legendColor: "#22D3EE",
    issues: [
      {
        id: "1.1.1",
        code: "1.1.1",
        title: "텍스트 대체",
        level: "A",
        status: "in_progress",
        category: "visual",
        summary: "이미지와 비텍스트 콘텐츠에 대체 텍스트가 필요합니다.",
      },
      {
        id: "3.3.2",
        code: "3.3.2",
        title: "레이블 또는 안내",
        level: "AA",
        status: "complete",
        category: "visual",
        summary: "입력 필드에 명확한 레이블 또는 안내가 제공됩니다.",
      },
      {
        id: "2.6.8",
        code: "2.6.8",
        title: "대상 크기",
        level: "A",
        status: "pending",
        category: "visual",
        summary: "터치/클릭 대상의 최소 크기를 확인해야 합니다.",
      },
      {
        id: "1.4.3",
        code: "1.4.3",
        title: "명도 대비",
        level: "AA",
        status: "pending",
        category: "visual",
        summary: "텍스트와 배경의 대비가 기준보다 낮습니다.",
      },
    ],
  },
  {
    id: "interaction",
    label: "구조/동작 품질 (Interaction)",
    legendColor: "#60A5FA",
    issues: [
      {
        id: "2.3.4",
        code: "2.3.4",
        title: "DOM/시맨틱",
        level: "A",
        status: "pending",
        category: "interaction",
        summary: "시맨틱 마크업 구조를 점검해야 합니다.",
      },
      {
        id: "2.2.3",
        code: "2.2.3",
        title: "폼 속성/자동 완성",
        level: "AA",
        status: "pending",
        category: "interaction",
        summary: "폼 필드 속성과 자동 완성 설정을 확인해야 합니다.",
      },
      {
        id: "2.4.6",
        code: "2.4.6",
        title: "문서 메타 데이터",
        level: "A",
        status: "pending",
        category: "interaction",
        summary: "문서 제목과 메타 정보를 보완해야 합니다.",
      },
    ],
  },
  {
    id: "ux",
    label: "전체 경험 (UX)",
    legendColor: "#3B82F6",
    issues: [
      {
        id: "1.2.4",
        code: "1.2.4",
        title: "일관된 식별",
        level: "A",
        status: "pending",
        category: "ux",
        summary: "동일 기능의 UI 요소 식별 방식을 통일해야 합니다.",
      },
      {
        id: "5.7.8",
        code: "5.7.8",
        title: "헬프 메커니즘",
        level: "AA",
        status: "pending",
        category: "ux",
        summary: "도움말 및 지원 경로를 제공해야 합니다.",
      },
    ],
  },
];

export function findAccessibilityIssue(issueId: string | null) {
  if (!issueId) return null;

  for (const group of ACCESSIBILITY_ISSUE_GROUPS) {
    const issue = group.issues.find((item) => item.id === issueId);
    if (issue) return issue;
  }

  return null;
}
