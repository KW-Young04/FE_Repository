import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { gitApi, toGitErrorMessage, type GitFileChangeResponse } from "@/api/git";
import type { AccessibilityIssue } from "../../types";
import CommitBranchPicker from "./CommitBranchPicker";

const MAX_COMMIT_MESSAGE_LENGTH = 200;
const STATUS = {
  MODIFIED: { label: "수정됨", code: "M", color: "text-amber-600" },
  ADDED: { label: "추가됨", code: "A", color: "text-emerald-600" },
  UNTRACKED: { label: "추적되지 않음", code: "U", color: "text-emerald-600" },
  DELETED: { label: "삭제됨", code: "D", color: "text-rose-600" },
  RENAMED: { label: "이름 변경", code: "R", color: "text-blue-600" },
};

function Icon({
  name,
  className = "",
}: {
  name: "branch" | "file" | "folder" | "close" | "check" | "arrow" | "warning";
  className?: string;
}) {
  const paths = {
    branch:
      "M6 6v12m0-6c8 0 12-3 12-6M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    file: "M14 3H5v18h14V8l-5-5Zm0 0v6h5",
    folder: "M3 6V4h6l2 3h10v13H3V6Z",
    close: "m6 6 12 12M18 6 6 18",
    check: "m5 12 4 4L19 6",
    arrow: "M12 20V4m-6 6 6-6 6 6",
    warning: "m12 3 10 18H2L12 3Zm0 6v5m0 3v.1",
  };
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

interface CommitDialogProps {
  repositoryUrl: string;
  branchName: string;
  currentBranch: string;
  branches: string[];
  changedFiles: GitFileChangeResponse[];
  selectedPaths: string[];
  issues: AccessibilityIssue[];
  isCommitting: boolean;
  commandMessage: string | null;
  commandFailed: boolean;
  onToggleSelect: (path: string) => void;
  onSelectAll: (selected: boolean) => void;
  onCommit: (message: string) => Promise<boolean>;
  onCommitAndPush: (message: string, remote?: string) => Promise<boolean>;
  onClose: () => void;
}

function DiffContent({
  repositoryUrl,
  branchName,
  path,
}: {
  repositoryUrl: string;
  branchName: string;
  path: string;
}) {
  const [result, setResult] = useState<{ diff: string; error: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void gitApi.getDiff({ repositoryUrl, branchName }, path).then(
      (response) => {
        if (!cancelled) setResult({ diff: response.diff ?? "", error: null });
      },
      (error: unknown) => {
        if (!cancelled)
          setResult({
            diff: "",
            error: toGitErrorMessage(error, "변경 내용을 불러오지 못했습니다."),
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repositoryUrl, branchName, path]);

  if (!result)
    return (
      <p role="status" className="p-8 text-sm text-slate-500">
        변경 내용을 불러오는 중...
      </p>
    );
  if (result.error)
    return (
      <p role="alert" className="p-8 text-sm text-rose-600">
        {result.error}
      </p>
    );
  if (!result.diff.trim())
    return (
      <p className="p-8 text-sm text-slate-500">
        표시할 변경 내용이 없습니다. 새 파일이나 아직 저장 중인 파일은 diff가 없을 수 있습니다.
      </p>
    );

  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;
  const lines = result.diff.replace(/\r\n/g, "\n").split("\n");
  return (
    <div
      className="min-w-max font-mono text-[13px] leading-7"
      aria-label={`${path} 변경 내용`}
    >
      {lines.map((line, index) => {
        const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
        if (hunk) {
          oldLine = Number(hunk[1]);
          newLine = Number(hunk[2]);
          inHunk = true;
          return (
            <div
              key={index}
              className="border-y border-violet-100 bg-violet-50/70 px-5 py-1.5 text-[11px] font-medium text-violet-500"
            >
              변경 위치 · 기존 {oldLine}번째 줄 / 현재 {newLine}번째 줄
            </div>
          );
        }
        if (!inHunk)
          return null;
        const added = line.startsWith("+");
        const removed = line.startsWith("-");
        const context = line.startsWith(" ");
        const before = removed || context ? oldLine++ : "";
        const after = added ? newLine++ : "";
        if (context) newLine++;
        if (!added && !removed && !context)
          return line ? (
            <div key={index} className="px-5 text-slate-400">
              {line}
            </div>
          ) : null;
        return (
          <div
            key={index}
            className={`flex ${added ? "bg-[#eefaf2] text-[#16a34a]" : removed ? "bg-[#fff0f1] text-[#f43f5e]" : "text-[#808196]"}`}
          >
            <span className="w-12 shrink-0 border-r border-black/5 pr-3 text-right text-[#858598] select-none">
              {before}
            </span>
            <span className="w-12 shrink-0 border-r border-black/5 pr-3 text-right text-[#858598] select-none">
              {after}
            </span>
            <span className="w-10 shrink-0 text-center select-none">
              {added ? "+" : removed ? "−" : ""}
            </span>
            <span className="whitespace-pre pr-8">{line.slice(1) || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CommitDialog({
  repositoryUrl,
  branchName,
  currentBranch,
  branches,
  changedFiles,
  selectedPaths,
  issues,
  isCommitting,
  commandMessage,
  commandFailed,
  onToggleSelect,
  onSelectAll,
  onCommit,
  onCommitAndPush,
  onClose,
}: CommitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [targetBranch, setTargetBranch] = useState(currentBranch || branchName);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = isCommitting || isSubmitting;
  const activeFile = changedFiles.find((file) => file.path === activePath) ?? changedFiles[0];
  const trimmedMessage = message.trim();
  const isCurrentBranch = targetBranch === (currentBranch || branchName);
  const canCommit =
    trimmedMessage.length > 0 && selectedPaths.length > 0 && !busy && isCurrentBranch;
  const allSelected =
    changedFiles.length > 0 && changedFiles.every((file) => selectedPaths.includes(file.path));
  const totals = changedFiles.reduce(
    (sum, file) => ({
      added: sum.added + file.addedLines,
      deleted: sum.deleted + file.deletedLines,
    }),
    { added: 0, deleted: 0 },
  );
  const unresolvedIssues = issues.filter((issue) => issue.status !== "complete");
  const groups = useMemo(() => {
    const folders = new Map<string, GitFileChangeResponse[]>();
    for (const file of changedFiles) {
      const folder = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";
      folders.set(folder, [...(folders.get(folder) ?? []), file]);
    }
    return [...folders.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [changedFiles]);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);

  const runAction = async (action: "commit" | "both") => {
    if (!canCommit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const succeeded = await (action === "commit"
        ? onCommit(trimmedMessage)
        : onCommitAndPush(trimmedMessage));
      if (succeeded) setMessage("");
    } catch (error) {
      setSubmitError(
        toGitErrorMessage(error, "변경 사항을 처리하지 못했습니다. 다시 시도해 주세요."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction("both");
  };

  const renderFiles = (files: GitFileChangeResponse[]) =>
    files.map((file) => (
      <li
        key={file.path}
        className={`flex items-center gap-2 rounded-md px-2 ${activeFile?.path === file.path ? "bg-violet-50" : "hover:bg-slate-100"}`}
      >
        <input
          type="checkbox"
          checked={selectedPaths.includes(file.path)}
          disabled={busy}
          onChange={() => onToggleSelect(file.path)}
          aria-label={`${file.path} 커밋 대상 선택`}
          className="h-3.5 w-3.5 shrink-0 accent-violet-600"
        />
        <button
          type="button"
          onClick={() => setActivePath(file.path)}
          aria-pressed={activeFile?.path === file.path}
          title={file.path}
          className={`flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm ${STATUS[file.status].color}`}
        >
          <Icon name="file" />
          <span className="truncate">{file.path.split("/").pop()}</span>
          <span className="ml-auto text-xs" aria-label={STATUS[file.status].label}>
            {STATUS[file.status].code}
          </span>
        </button>
      </li>
    ));

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="commit-dialog-title"
      className="fixed inset-0 m-auto h-[88dvh] max-h-[1000px] w-[92vw] max-w-[1500px] overflow-hidden rounded-xl border border-[#dedee5] bg-white p-0 text-[#242428] shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center gap-4 border-b border-[#e9e9ef] px-5 py-5 sm:px-8 sm:py-6">
          <img src="/codee.png" alt="" className="h-11 w-14 shrink-0 object-contain" />
          <div>
            <h2 id="commit-dialog-title" className="text-lg font-bold">
              변경 사항 커밋
            </h2>
            <p className="mt-0.5 text-sm text-[#858598]">Source Control</p>
          </div>
          <CommitBranchPicker
            branches={branches}
            value={targetBranch}
            currentBranch={currentBranch || branchName}
            disabled={busy}
            onChange={setTargetBranch}
          />
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="닫기"
            className="ml-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] max-sm:grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-[#e9e9ef] bg-[#fafafa] max-sm:max-h-40 max-sm:overflow-auto max-sm:border-b">
            <div className="flex items-center justify-between px-4 py-3 text-xs font-bold text-[#858598]">
              변경된 파일
              <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-500">
                {changedFiles.length}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 pb-2 text-[11px] text-slate-400">
              <span>{selectedPaths.length}개 선택됨</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onSelectAll(!allSelected)}
                className="text-violet-600 hover:underline disabled:opacity-50"
              >
                {allSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <nav
              aria-label="변경된 파일"
              className="min-h-0 flex-1 overflow-auto px-3 pb-4 max-sm:flex-none"
            >
              {groups.map(([folder, files]) =>
                folder ? (
                  <details key={folder} open className="mb-1">
                    <summary className="cursor-pointer rounded-md py-1.5 text-sm text-slate-600">
                      <span className="inline-flex max-w-[90%] items-center gap-2 align-middle">
                        <Icon name="folder" className="text-blue-400" />
                        <span className="truncate" title={folder}>
                          {folder}
                        </span>
                      </span>
                    </summary>
                    <ul className="pl-3">{renderFiles(files)}</ul>
                  </details>
                ) : (
                  <ul key="root">{renderFiles(files)}</ul>
                ),
              )}
              {!changedFiles.length && (
                <p className="px-2 py-5 text-xs text-slate-400">커밋할 변경 사항이 없습니다.</p>
              )}
            </nav>
            <div className="space-y-3 border-t border-[#eeeeF2] p-4 max-sm:hidden">
              <div className="flex flex-wrap gap-x-3 gap-y-1 pb-3 text-[10px] text-slate-400">
                {Object.entries(STATUS)
                  .filter(([status]) => changedFiles.some((file) => file.status === status))
                  .map(([status, value]) => (
                    <span key={status}>
                      <b className={`mr-1.5 ${value.color}`}>{value.code}</b>
                      {value.label}
                    </span>
                  ))}
              </div>
              <section className="rounded-xl bg-[#eeeef2] p-3.5">
                <h3 className="mb-3 text-xs font-bold text-[#808194]">변경 요약</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#858598]">변경된 파일</dt>
                    <dd>{changedFiles.length}개</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#858598]">추가된 줄</dt>
                    <dd className="font-mono text-green-600">+{totals.added}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#858598]">삭제된 줄</dt>
                    <dd className="font-mono text-rose-500">-{totals.deleted}</dd>
                  </div>
                </dl>
              </section>
              {unresolvedIssues.length > 0 && (
                <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-700">
                  <Icon name="warning" className="mt-0.5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-semibold">접근성 경고</h3>
                    <p className="mt-1 text-xs leading-6">
                      현재 분석에서 접근성 이슈 {unresolvedIssues.length}건이 감지되었습니다. 커밋
                      전 확인을 권장합니다.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </aside>
          <main className="flex min-h-0 min-w-0 flex-col overflow-auto">
            <div className="flex min-h-[180px] flex-1 flex-col">
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#dddde5] bg-[#eeeef2] px-5 lg:px-8">
                {activeFile ? (
                  <>
                    <span className={`text-sm ${STATUS[activeFile.status].color}`}>
                      {STATUS[activeFile.status].code}
                    </span>
                    <Icon name="file" className="h-4 w-4 text-blue-400" />
                    <span className="shrink-0 text-sm font-semibold">
                      {activeFile.path.split("/").pop()}
                    </span>
                    <span className="truncate font-mono text-xs text-[#858598]">
                      {activeFile.path}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-xs text-green-600">
                      +{activeFile.addedLines}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-rose-500">
                      -{activeFile.deletedLines}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">변경 내용</span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {activeFile && repositoryUrl && branchName ? (
                  <DiffContent
                    key={`${repositoryUrl}:${branchName}:${activeFile.path}`}
                    repositoryUrl={repositoryUrl}
                    branchName={branchName}
                    path={activeFile.path}
                  />
                ) : (
                  <p className="p-8 text-sm text-slate-400">
                    {activeFile
                      ? "저장소와 브랜치 정보를 확인해 주세요."
                      : "커밋할 변경 사항이 없습니다."}
                  </p>
                )}
              </div>
            </div>
            <footer className="shrink-0 border-t border-[#e9e9ef] px-5 py-5 lg:px-8">
              <label htmlFor="commit-message" className="text-sm font-semibold">
                커밋 메시지
              </label>
              <textarea
                id="commit-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MAX_COMMIT_MESSAGE_LENGTH}
                disabled={busy}
                placeholder="변경 사항을 설명하는 메시지를 입력하세요..."
                autoFocus
                className="mt-3 h-24 w-full resize-none rounded-lg border border-[#dedee5] bg-[#f5f5f7] px-4 py-3 text-sm placeholder:text-[#96969e] focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <div className="mt-1 text-right text-[10px] text-slate-400">
                {message.length}/{MAX_COMMIT_MESSAGE_LENGTH}
              </div>
              {!isCurrentBranch && (
                <p role="status" className="mt-2 text-xs text-amber-700">
                  현재 다른 브랜치로 커밋할 수 없습니다. {currentBranch || branchName} 브랜치를
                  선택해 주세요.
                </p>
              )}
              {(submitError || commandMessage) && (
                <p
                  role={submitError || commandFailed ? "alert" : "status"}
                  className={`mt-2 rounded-lg px-3 py-2 text-xs ${submitError || commandFailed ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}
                >
                  {submitError || commandMessage}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div className="ml-auto flex gap-3">
                  <button
                    type="button"
                    onClick={() => void runAction("commit")}
                    disabled={!canCommit}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e5e5eb] px-5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 lg:min-w-48"
                  >
                    <Icon name="check" className="h-4 w-4" />
                    Commit만
                  </button>
                  <button
                    type="submit"
                    disabled={!canCommit}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7047ff] px-5 text-sm font-medium text-white hover:bg-[#6035ee] disabled:cursor-not-allowed disabled:opacity-40 lg:min-w-48"
                  >
                    <Icon name="arrow" className="h-4 w-4" />
                    {busy ? "처리 중..." : "Commit & Push"}
                  </button>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </form>
    </dialog>
  );
}
