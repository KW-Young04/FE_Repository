import { useEffect, useRef, useState } from "react";

interface CommitBranchPickerProps {
  branches: string[];
  value: string;
  currentBranch: string;
  disabled: boolean;
  onChange: (branch: string) => void;
  onCreate?: (name: string) => Promise<void>;
}

export default function CommitBranchPicker({
  branches,
  value,
  currentBranch,
  disabled,
  onChange,
  onCreate,
}: CommitBranchPickerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const options = [...new Set([currentBranch, ...branches].filter(Boolean))];
  const trimmedName = name.trim();
  const invalidName =
    !trimmedName ||
    trimmedName === "@" ||
    trimmedName.startsWith("-") ||
    /[\s~^:?*[\\]/.test(trimmedName) ||
    [...trimmedName].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    trimmedName.includes("..") ||
    trimmedName.includes("@{") ||
    trimmedName.endsWith(".") ||
    trimmedName.split("/").some((part) => !part || part.startsWith(".") || part.endsWith(".lock"));
  const duplicate = options.includes(trimmedName);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const createBranch = async () => {
    if (!onCreate || invalidName || duplicate || disabled || creating) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(trimmedName);
      onChange(trimmedName);
      setName("");
      setOpen(false);
      buttonRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "브랜치를 생성하지 못했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative ml-auto max-w-[40%]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || creating}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="commit-branch-picker"
        aria-label={`커밋 대상 브랜치: ${value || "선택"}`}
        className="flex h-10 max-w-full items-center gap-1 rounded-full border border-[#DECDFB] bg-[#F6F1FE] px-5 text-sm font-semibold text-[#7C3AED] transition-colors hover:bg-[#EDE3FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DECDFB] disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1 h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="6" cy="5" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M6 8v3a8 8 0 0 0 8 8h1" />
        </svg>
        <span className="truncate">{value || "브랜치 선택"}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <section
          id="commit-branch-picker"
          aria-label="커밋 대상 브랜치 선택"
          className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[80vw] rounded-xl border border-violet-100 bg-white p-2 text-slate-700 shadow-xl"
        >
          <h3 className="px-3 py-2 text-xs font-semibold text-slate-400">
            커밋 · 푸시 대상 브랜치
          </h3>
          <div className="max-h-48 overflow-y-auto">
            {options.map((branch) => (
              <button
                key={branch}
                type="button"
                disabled={disabled || creating}
                aria-pressed={branch === value}
                onClick={() => {
                  onChange(branch);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-violet-50 ${branch === value ? "bg-violet-50 font-semibold text-violet-600" : ""}`}
              >
                <span className="min-w-0 flex-1 truncate" title={branch}>
                  {branch}
                </span>
                {branch === currentBranch && (
                  <span className="shrink-0 text-[10px] text-slate-400">현재</span>
                )}
                {branch === value && <span aria-hidden="true">✓</span>}
              </button>
            ))}
            {!options.length && (
              <p className="px-3 py-2 text-xs text-slate-400">사용 가능한 브랜치가 없습니다.</p>
            )}
          </div>
          <div className="mt-2 border-t border-slate-100 px-2 pt-3 pb-2">
            <label htmlFor="new-commit-branch" className="text-xs font-semibold">
              새 브랜치 생성
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="new-commit-branch"
                value={name}
                disabled={disabled || creating}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createBranch();
                  }
                }}
                placeholder="feature/new-branch"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-xs focus:border-violet-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void createBranch()}
                disabled={!onCreate || invalidName || duplicate || disabled || creating}
                className="rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-40"
              >
                {creating ? "생성 중" : "생성"}
              </button>
            </div>
            {name && (invalidName || duplicate) && (
              <p className="mt-2 text-xs text-rose-600">
                {duplicate ? "이미 존재하는 브랜치입니다." : "유효한 브랜치 이름을 입력해 주세요."}
              </p>
            )}
            {!onCreate && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                현재 새 브랜치 생성을 사용할 수 없습니다.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-xs text-rose-600">
                {error}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
