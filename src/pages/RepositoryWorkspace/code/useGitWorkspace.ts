import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  gitApi,
  toGitErrorMessage,
  type GitCommitLogResponse,
  type GitFileChangeResponse,
  type GitStatusResponse,
  type GitWorkspaceParams,
} from "@/api/git";

import type { BranchItem, CommitNode } from "../types";

const BRANCH_PALETTE = ["#3B82F6", "#F59E0B", "#EC4899", "#10B981", "#8B5CF6", "#EF4444"];

function toBranchItems(branches: string[], currentBranch: string): BranchItem[] {
  return branches.map((name, index) => ({
    id: name,
    name,
    color: BRANCH_PALETTE[index % BRANCH_PALETTE.length],
    isCurrent: name === currentBranch,
  }));
}

/** origin/main, remotes/origin/main 등 원격 접두사를 떼어 로컬 브랜치와 색/이름을 맞춘다. */
function normalizeBranchName(ref: string): string {
  return ref.replace(/^remotes\//, "").replace(/^origin\//, "");
}

function toCommitNodes(commits: GitCommitLogResponse[], branchNames: string[]): CommitNode[] {
  const colorByBranch = new Map<string, string>();
  const assignColor = (branch: string): string => {
    const existing = colorByBranch.get(branch);
    if (existing) return existing;
    const color = BRANCH_PALETTE[colorByBranch.size % BRANCH_PALETTE.length];
    colorByBranch.set(branch, color);
    return color;
  };

  // 로컬 브랜치 순서대로 색을 먼저 확보해 브랜치 목록과 그래프 색을 일치시킨다.
  branchNames.forEach((name) => assignColor(name));

  let lastBranch = branchNames[0] ?? "main";
  return commits.map((commit) => {
    const refBranch = commit.refs.map(normalizeBranchName).find((name) => name.length > 0);
    const branch = refBranch ?? lastBranch;
    lastBranch = branch;

    return {
      id: commit.hash || commit.shortHash,
      message: commit.message,
      author: commit.author,
      branch,
      color: assignColor(branch),
      isHead: commit.head,
    };
  });
}

export interface GitWorkspaceState {
  branches: BranchItem[];
  currentBranch: string;
  commits: CommitNode[];
  changedFiles: GitFileChangeResponse[];
  hasChanges: boolean;
  selectedPaths: string[];
  diffPath: string | null;
  diff: string | null;
  isLoading: boolean;
  isDiffLoading: boolean;
  isCommitting: boolean;
  error: string | null;
  commandMessage: string | null;
  commandFailed: boolean;
  refresh: () => Promise<void>;
  toggleSelectedPath: (path: string) => void;
  setAllSelected: (selected: boolean) => void;
  openDiff: (path: string) => Promise<void>;
  clearDiff: () => void;
  commit: (message: string) => Promise<boolean>;
  push: (remote?: string) => Promise<boolean>;
  commitAndPush: (message: string, remote?: string) => Promise<boolean>;
  dismissCommandMessage: () => void;
}

interface UseGitWorkspaceOptions {
  repositoryUrl: string;
  branchName: string;
  localChangedFiles?: GitFileChangeResponse[];
}

export function useGitWorkspace({
  repositoryUrl,
  branchName,
  localChangedFiles = [],
}: UseGitWorkspaceOptions): GitWorkspaceState {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [commits, setCommits] = useState<CommitNode[]>([]);
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandMessage, setCommandMessage] = useState<string | null>(null);
  const [commandFailed, setCommandFailed] = useState(false);

  const isMountedRef = useRef(true);
  const knownChangedPathsRef = useRef(new Set<string>());
  const diffRequestRef = useRef(0);
  const refreshRequestRef = useRef(0);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const workspaceParams = useMemo<GitWorkspaceParams | null>(() => {
    if (!repositoryUrl || !branchName) return null;
    return { repositoryUrl, branchName };
  }, [repositoryUrl, branchName]);

  const refresh = useCallback(async () => {
    const request = ++refreshRequestRef.current;
    if (!workspaceParams) {
      setBranches([]);
      setCurrentBranch(branchName);
      setCommits([]);
      setStatus(null);
      setSelectedPaths(localChangedFiles.map((file) => file.path));
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentBranch((current) => current || branchName);

    const [branchResult, statusResult, graphResult] = await Promise.allSettled([
      gitApi.getBranches(workspaceParams),
      gitApi.getStatus(workspaceParams),
      gitApi.getGraph(workspaceParams),
    ]);

    if (!isMountedRef.current || request !== refreshRequestRef.current) return;

    let branchNames: string[] = [];
    if (branchResult.status === "fulfilled") {
      const { currentBranch: current, branches: names } = branchResult.value;
      branchNames = names ?? [];
      setCurrentBranch(current ?? branchName);
      setBranches(toBranchItems(branchNames, current ?? ""));
    }

    if (graphResult.status === "fulfilled") {
      setCommits(toCommitNodes(graphResult.value.commits ?? [], branchNames));
    } else {
      setCommits([]);
    }

    if (statusResult.status === "fulfilled") {
      const nextStatus = statusResult.value;
      setCurrentBranch((current) => current || nextStatus.branch || branchName);
      setStatus(nextStatus);
      const changedPaths = [
        ...(nextStatus.files ?? []).map((file) => file.path),
        ...localChangedFiles.map((file) => file.path),
      ];
      const added = changedPaths.filter((path) => !knownChangedPathsRef.current.has(path));
      knownChangedPathsRef.current = new Set(changedPaths);
      // 새로 감지된 변경 파일은 기본 선택, 사라진 파일은 선택 해제한다.
      setSelectedPaths((prev) => {
        const kept = prev.filter((path) => changedPaths.includes(path));
        return [...new Set([...kept, ...added])];
      });
    } else {
      setStatus(null);
      const localPaths = localChangedFiles.map((file) => file.path);
      const added = localPaths.filter((path) => !knownChangedPathsRef.current.has(path));
      knownChangedPathsRef.current = new Set(localPaths);
      setSelectedPaths((prev) => {
        const kept = prev.filter((path) => localPaths.includes(path));
        return [...new Set([...kept, ...added])];
      });
    }

    const failure = [branchResult, statusResult, graphResult].find(
      (result) => result.status === "rejected",
    );
    if (failure && failure.status === "rejected") {
      setError(
        toGitErrorMessage(
          failure.reason,
          "Git 정보를 불러오지 못했습니다. 서버 상태를 확인해 주세요.",
        ),
      );
    }

    setIsLoading(false);
  }, [branchName, localChangedFiles, workspaceParams]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSelectedPath = useCallback((path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path],
    );
  }, []);

  const changedFiles = useMemo(() => {
    const serverFiles = status?.files ?? [];
    if (localChangedFiles.length === 0) return serverFiles;

    const serverPaths = new Set(serverFiles.map((file) => file.path));
    const localOnlyFiles = localChangedFiles.filter((file) => !serverPaths.has(file.path));
    return [...serverFiles, ...localOnlyFiles];
  }, [localChangedFiles, status]);

  const setAllSelected = useCallback(
    (selected: boolean) => {
      setSelectedPaths(selected ? changedFiles.map((file) => file.path) : []);
    },
    [changedFiles],
  );

  const openDiff = useCallback(
    async (path: string) => {
      if (!workspaceParams) return;

      const request = ++diffRequestRef.current;

      setDiffPath(path);
      setDiff(null);
      setIsDiffLoading(true);

      try {
        const response = await gitApi.getDiff(workspaceParams, path);
        if (!isMountedRef.current || request !== diffRequestRef.current) return;
        setDiff(response.diff ?? "");
      } catch (diffError) {
        if (!isMountedRef.current || request !== diffRequestRef.current) return;
        setDiff(null);
        setError(toGitErrorMessage(diffError, `${path} 의 변경 내용을 불러오지 못했습니다.`));
      } finally {
        if (isMountedRef.current && request === diffRequestRef.current) setIsDiffLoading(false);
      }
    },
    [workspaceParams],
  );

  const clearDiff = useCallback(() => {
    diffRequestRef.current += 1;
    setIsDiffLoading(false);
    setDiffPath(null);
    setDiff(null);
  }, []);

  const runCommand = useCallback(
    async (task: () => Promise<{ ok: boolean; message: string }>, fallbackError: string) => {
      setIsCommitting(true);
      setCommandMessage(null);
      setCommandFailed(false);

      try {
        const { ok, message } = await task();
        if (!isMountedRef.current) return ok;
        setCommandMessage(message);
        setCommandFailed(!ok);
        if (ok) await refresh();
        return ok;
      } catch (commandError) {
        if (!isMountedRef.current) return false;
        setCommandMessage(toGitErrorMessage(commandError, fallbackError));
        setCommandFailed(true);
        return false;
      } finally {
        if (isMountedRef.current) setIsCommitting(false);
      }
    },
    [refresh],
  );

  const commit = useCallback(
    (message: string) =>
      runCommand(async () => {
        if (!workspaceParams) {
          return { ok: false, message: "저장소 또는 브랜치 정보가 없습니다." };
        }
        const response = await gitApi.commit({ ...workspaceParams, message, files: selectedPaths });
        return {
          ok: response.success,
          message: response.success
            ? `커밋 완료 (${response.changedFileCount}개 파일, ${response.commitHash?.slice(0, 7) ?? "-"})`
            : (response.message ?? "커밋에 실패했습니다."),
        };
      }, "커밋에 실패했습니다."),
    [runCommand, selectedPaths, workspaceParams],
  );

  const push = useCallback(
    (remote?: string) =>
      runCommand(async () => {
        if (!workspaceParams) {
          return { ok: false, message: "저장소 또는 브랜치 정보가 없습니다." };
        }
        const response = await gitApi.push({ ...workspaceParams, ...(remote ? { remote } : {}) });
        return {
          ok: response.success,
          message: response.success
            ? `푸시 완료 (${response.remote}/${response.branch})`
            : "푸시에 실패했습니다.",
        };
      }, "푸시에 실패했습니다."),
    [runCommand, workspaceParams],
  );

  const commitAndPush = useCallback(
    (message: string, remote?: string) =>
      runCommand(async () => {
        if (!workspaceParams) {
          return { ok: false, message: "저장소 또는 브랜치 정보가 없습니다." };
        }
        const response = await gitApi.commitAndPush({
          ...workspaceParams,
          message,
          files: selectedPaths,
          ...(remote ? { remote } : {}),
        });
        const ok = response.commit.success && response.push.success;
        const failed = !response.commit.success ? response.commit : response.push;

        return {
          ok,
          message: ok
            ? `커밋 & 푸시 완료 (${response.commit.commitHash?.slice(0, 7) ?? "-"})`
            : (failed.message ?? "커밋 & 푸시에 실패했습니다."),
        };
      }, "커밋 & 푸시에 실패했습니다."),
    [runCommand, selectedPaths, workspaceParams],
  );

  return {
    branches,
    currentBranch,
    commits,
    changedFiles,
    hasChanges: status?.hasChanges ?? false,
    selectedPaths,
    diffPath,
    diff,
    isLoading,
    isDiffLoading,
    isCommitting,
    error,
    commandMessage,
    commandFailed,
    refresh,
    toggleSelectedPath,
    setAllSelected,
    openDiff,
    clearDiff,
    commit,
    push,
    commitAndPush,
    dismissCommandMessage: () => setCommandMessage(null),
  };
}
