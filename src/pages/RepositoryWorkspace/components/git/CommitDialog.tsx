import { useState, type FormEvent } from "react";

import type { GitFileChangeResponse } from "@/api/git";

const MAX_COMMIT_MESSAGE_LENGTH = 200;

interface CommitDialogProps {
  currentBranch: string;
  changedFiles: GitFileChangeResponse[];
  selectedPaths: string[];
  isCommitting: boolean;
  commandMessage: string | null;
  commandFailed: boolean;
  onToggleSelect: (path: string) => void;
  onSelectAll: (selected: boolean) => void;
  onCommit: (message: string) => Promise<boolean>;
  onPush: (remote?: string) => Promise<boolean>;
  onCommitAndPush: (message: string, remote?: string) => Promise<boolean>;
  onClose: () => void;
}

export default function CommitDialog({
  currentBranch,
  changedFiles,
  selectedPaths,
  isCommitting,
  commandMessage,
  commandFailed,
  onToggleSelect,
  onSelectAll,
  onCommit,
  onPush,
  onCommitAndPush,
  onClose,
}: CommitDialogProps) {
  const [message, setMessage] = useState("");
  const [remote, setRemote] = useState("");

  const trimmedMessage = message.trim();
  const remoteValue = remote.trim() || undefined;
  const canCommit = trimmedMessage.length > 0 && selectedPaths.length > 0 && !isCommitting;
  const allSelected = changedFiles.length > 0 && selectedPaths.length === changedFiles.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCommit) return;
    const succeeded = await onCommitAndPush(trimmedMessage, remoteValue);
    if (succeeded) setMessage("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="변경 사항 커밋"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">변경 사항 커밋</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              현재 브랜치: {currentBranch || "확인할 수 없음"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-600">커밋 메시지</span>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_COMMIT_MESSAGE_LENGTH}
              placeholder="예) 이미지 대체 텍스트 추가"
              autoFocus
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:border-violet-400 focus:outline-none"
            />
            <span className="mt-1 block text-right text-[10px] font-medium text-slate-400">
              {message.length}/{MAX_COMMIT_MESSAGE_LENGTH}
            </span>
          </label>

          <label className="mt-2 block">
            <span className="text-xs font-bold text-slate-600">원격 이름 (선택)</span>
            <input
              type="text"
              value={remote}
              onChange={(event) => setRemote(event.target.value)}
              placeholder="origin"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:border-violet-400 focus:outline-none"
            />
          </label>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                커밋할 파일 ({selectedPaths.length}/{changedFiles.length})
              </span>
              {changedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectAll(!allSelected)}
                  className="text-[11px] font-bold text-violet-600 hover:underline"
                >
                  {allSelected ? "전체 해제" : "전체 선택"}
                </button>
              )}
            </div>

            {changedFiles.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs font-medium text-slate-400">
                커밋할 변경 사항이 없습니다.
              </p>
            ) : (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                {changedFiles.map((file) => (
                  <li key={file.path} className="border-b border-slate-100 last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedPaths.includes(file.path)}
                        onChange={() => onToggleSelect(file.path)}
                        className="h-3.5 w-3.5 shrink-0 accent-violet-600"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">
                        {file.path}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">
                        {file.status}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {commandMessage && (
            <p
              role="status"
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                commandFailed ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {commandMessage}
            </p>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => void onPush(remoteValue)}
            disabled={isCommitting}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            푸시만
          </button>

          <button
            type="button"
            onClick={() => void onCommit(trimmedMessage)}
            disabled={!canCommit}
            className="h-9 rounded-lg border border-violet-200 px-3 text-sm font-semibold text-violet-600 hover:bg-violet-50 disabled:opacity-50"
          >
            커밋만
          </button>

          <button
            type="submit"
            disabled={!canCommit}
            className="h-9 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
          >
            {isCommitting ? "처리 중..." : "커밋 & 푸시"}
          </button>
        </footer>
      </form>
    </div>
  );
}
