import type {
  AiDiffLines,
  BranchItem,
  CommitNode,
  ProblemFileGroup,
  ProblemSeverity,
} from "../types";

const BRANCH_COLOR = {
  main: "#3B82F6",
  develop: "#F59E0B",
  featureUi: "#EC4899",
} as const;

export const COMMIT_GRAPH: CommitNode[] = [
  {
    id: "c1",
    message: "Merge remote repository",
    author: "songsonghi",
    branch: "main",
    color: BRANCH_COLOR.main,
    isHead: true,
  },
  {
    id: "c2",
    message: "Initial commit",
    author: "Mynamels",
    branch: "develop",
    color: BRANCH_COLOR.develop,
  },
  {
    id: "c3",
    message: "Add README",
    author: "rangbabo",
    branch: "feature/ui",
    color: BRANCH_COLOR.featureUi,
  },
  {
    id: "c4",
    message: "Add Streamlit quiz app",
    author: "kiki",
    branch: "feature/ui",
    color: BRANCH_COLOR.featureUi,
  },
];

export const WORKSPACE_BRANCHES: BranchItem[] = [
  { id: "main", name: "main", color: BRANCH_COLOR.main, isCurrent: true },
  { id: "develop", name: "develop", color: BRANCH_COLOR.develop },
  { id: "feature/ui", name: "feature/ui", color: BRANCH_COLOR.featureUi },
];

export const PROBLEM_GROUPS: ProblemFileGroup[] = [
  {
    path: "app.py",
    problems: [
      {
        id: "app-1",
        severity: "error",
        message: 'Import "views.login_view" could not be resolved',
        source: "Pylance",
        line: 3,
        column: 6,
      },
      {
        id: "app-2",
        severity: "warning",
        message: '"submitted" is not defined',
        source: "Pylance",
        line: 14,
        column: 8,
      },
    ],
  },
  {
    path: "views/quiz_view.py",
    problems: [
      {
        id: "quiz-1",
        severity: "warning",
        message: 'Argument of type "None" cannot be assigned to parameter "user_id" of type "str"',
        source: "Pylance",
        line: 41,
        column: 15,
      },
      {
        id: "quiz-2",
        severity: "info",
        message: 'Variable "result" is assigned but never used',
        source: "Pylance",
        line: 87,
        column: 5,
      },
    ],
  },
  {
    path: "utils.py",
    problems: [
      {
        id: "utils-1",
        severity: "error",
        message: "Expected indented block",
        source: "Pylance",
        line: 12,
        column: 1,
      },
      {
        id: "utils-2",
        severity: "info",
        message: 'Function "load_questions" is not accessed',
        source: "Pylance",
        line: 6,
        column: 5,
      },
    ],
  },
];

export const CHAT_SUGGESTIONS: string[] = [
  "어떤 웹 접근성 표준을 충족하지 못했는지 점검해줘",
  "발생한 에러를 수정해줘",
  "지금 페이지 수정사항을 커밋해줘",
];

/** 파일 이름 기준 AI 제안 diff. 실제 제안 API가 붙기 전까지 사용하는 데모 데이터. */
const AI_DIFF_BY_FILE_NAME: Record<string, AiDiffLines> = {
  "app.py": { removed: [3], added: [12, 13, 14] },
};

export function findAiDiff(path: string | null): AiDiffLines | null {
  if (!path) return null;

  const fileName = path.split("/").pop() ?? path;
  return AI_DIFF_BY_FILE_NAME[fileName] ?? null;
}

export function countProblemsBySeverity(
  groups: ProblemFileGroup[],
): Record<ProblemSeverity, number> {
  const counts: Record<ProblemSeverity, number> = { error: 0, warning: 0, info: 0 };

  for (const group of groups) {
    for (const problem of group.problems) {
      counts[problem.severity] += 1;
    }
  }

  return counts;
}
