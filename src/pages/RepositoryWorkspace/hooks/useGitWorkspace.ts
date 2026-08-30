import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  gitApi,
  toGitErrorMessage,
  type GitFileChangeResponse,
  type GitStatusResponse,
} from "@/api/git";

import type { BranchItem } from "../types";

const BRANCH_PALETTE = ["#3B82F6", "#F59E0B", "#EC4899", "#10B981", "#8B5CF6", "#EF4444"];

function toBranchItems(branches: string[], currentBranch: string): BranchItem[] {
  return branches.map((name, index) => ({
    id: name,
    name,
    color: BRANCH_PALETTE[index % BRANCH_PALETTE.length],
    isCurrent: name === currentBranch,
  }));
}

export interface GitWorkspaceState {
  branches: BranchItem[];
  currentBranch: string;
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

export function useGitWorkspace(): GitWorkspaceState {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
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
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [branchResult, statusResult] = await Promise.allSettled([
      gitApi.getBranches(),
      gitApi.getStatus(),
    ]);

    if (!isMountedRef.current) return;

    if (branchResult.status === "fulfilled") {
      const { currentBranch: current, branches: names } = branchResult.value;
      setCurrentBranch(current ?? "");
      setBranches(toBranchItems(names ?? [], current ?? ""));
    }

    if (statusResult.status === "fulfilled") {
      const nextStatus = statusResult.value;
      setStatus(nextStatus);
      const changedPaths = (nextStatus.files ?? []).map((file) => file.path);
      // 새로 감지된 변경 파일은 기본 선택, 사라진 파일은 선택 해제한다.
      setSelectedPaths((prev) => {
        const kept = prev.filter((path) => changedPaths.includes(path));
        const added = changedPaths.filter((path) => !prev.includes(path));
        return [...kept, ...added];
      });
    } else {
      setStatus(null);
      setSelectedPaths([]);
    }

    const failure = [branchResult, statusResult].find((result) => result.status === "rejected");
    if (failure && failure.status === "rejected") {
      setError(
        toGitErrorMessage(
          failure.reason,
          "Git 정보를 불러오지 못했습니다. 서버 상태를 확인해 주세요.",
        ),
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSelectedPath = useCallback((path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path],
    );
  }, []);

  const changedFiles = useMemo(() => status?.files ?? [], [status]);

  const setAllSelected = useCallback(
    (selected: boolean) => {
      setSelectedPaths(selected ? changedFiles.map((file) => file.path) : []);
    },
    [changedFiles],
  );

  const openDiff = useCallback(async (path: string) => {
    setDiffPath(path);
    setDiff(null);
    setIsDiffLoading(true);

    try {
      const response = await gitApi.getDiff(path);
      if (!isMountedRef.current) return;
      setDiff(response.diff ?? "");
    } catch (diffError) {
      if (!isMountedRef.current) return;
      setDiff(null);
      setError(toGitErrorMessage(diffError, `${path} 의 변경 내용을 불러오지 못했습니다.`));
    } finally {
      if (isMountedRef.current) setIsDiffLoading(false);
    }
  }, []);

  const clearDiff = useCallback(() => {
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
        const response = await gitApi.commit({ message, files: selectedPaths });
        return {
          ok: response.success,
          message: response.success
            ? `커밋 완료 (${response.changedFileCount}개 파일, ${response.commitHash?.slice(0, 7) ?? "-"})`
            : (response.message ?? "커밋에 실패했습니다."),
        };
      }, "커밋에 실패했습니다."),
    [runCommand, selectedPaths],
  );

  const push = useCallback(
    (remote?: string) =>
      runCommand(async () => {
        const response = await gitApi.push(remote ? { remote } : {});
        return {
          ok: response.success,
          message: response.success
            ? `푸시 완료 (${response.remote}/${response.branch})`
            : "푸시에 실패했습니다.",
        };
      }, "푸시에 실패했습니다."),
    [runCommand],
  );

  const commitAndPush = useCallback(
    (message: string, remote?: string) =>
      runCommand(async () => {
        const response = await gitApi.commitAndPush({
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
    [runCommand, selectedPaths],
  );

  return {
    branches,
    currentBranch,
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
