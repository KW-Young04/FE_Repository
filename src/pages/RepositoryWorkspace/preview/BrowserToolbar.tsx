import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { BackIcon, ForwardIcon, RefreshIcon } from "./toolbarIcons";

function ToolbarIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-current transition-colors hover:bg-white hover:text-point disabled:cursor-not-allowed disabled:text-[#c5c6cc] disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

interface BrowserToolbarProps {
  displayUrl: string;
  showErrors: boolean;
  onToggleErrors: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  canNavigate?: boolean;
  onNavigate?: (input: string) => boolean;
}

export default function BrowserToolbar({
  displayUrl,
  showErrors,
  onToggleErrors,
  onBack,
  onForward,
  onReload,
  canGoBack = false,
  canGoForward = false,
  canNavigate = false,
  onNavigate,
}: BrowserToolbarProps) {
  const [draft, setDraft] = useState(displayUrl);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dirtyRef = useRef(false);
  const keepFocusRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) setDraft(displayUrl);
  }, [displayUrl]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const form = formRef.current;
      const target = event.target;
      keepFocusRef.current = Boolean(
        form && target instanceof Node && form.contains(target),
      );
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  const commitDraft = () => {
    if (!canNavigate || !onNavigate) return;
    const accepted = onNavigate(draft);
    setHasError(!accepted);
    if (accepted) {
      dirtyRef.current = false;
      keepFocusRef.current = false;
      inputRef.current?.blur();
    }
  };

  const revertDraft = () => {
    dirtyRef.current = false;
    setHasError(false);
    setDraft(displayUrl);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commitDraft();
  };

  return (
    <div className="relative z-10 grid h-[39px] flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#dbdbe1] bg-[#f4f4f6] px-2">
      <div className="flex items-center gap-0.5 text-[#2e3034]">
        <ToolbarIconButton
          label="이전 페이지"
          disabled={!canNavigate || !canGoBack}
          onClick={onBack}
        >
          <BackIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="다음 페이지"
          disabled={!canNavigate || !canGoForward}
          onClick={onForward}
        >
          <ForwardIcon />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="미리보기 새로고침"
          disabled={!canNavigate}
          onClick={onReload}
        >
          <RefreshIcon />
        </ToolbarIconButton>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onPointerDown={() => {
          keepFocusRef.current = true;
        }}
        onClick={() => {
          inputRef.current?.focus();
        }}
        className={[
          "flex h-[27px] cursor-text items-center overflow-hidden rounded-[14px] border bg-white px-[13px] text-xs text-[#2e3034] focus-within:ring-2",
          hasError
            ? "border-red-400 focus-within:ring-red-300"
            : "border-[#d9d9de] focus-within:ring-point",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          name="preview-address"
          type="text"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="미리보기 주소"
          aria-invalid={hasError}
          title={
            hasError
              ? "앱 내부 경로만 이동할 수 있습니다. 예: /about 또는 http://localhost:4173/about"
              : undefined
          }
          className="h-full w-full min-w-0 cursor-text border-0 bg-transparent p-0 text-xs text-[#2e3034] outline-none"
          onChange={(event) => {
            dirtyRef.current = true;
            setDraft(event.target.value);
            setHasError(false);
          }}
          onFocus={() => {
            keepFocusRef.current = true;
          }}
          onBlur={() => {
            if (!keepFocusRef.current) {
              revertDraft();
              return;
            }
            window.requestAnimationFrame(() => {
              const active = document.activeElement;
              if (active === inputRef.current) return;
              if (
                active == null ||
                active === document.body ||
                active.tagName === "IFRAME"
              ) {
                inputRef.current?.focus();
              }
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              keepFocusRef.current = false;
              revertDraft();
              event.currentTarget.blur();
            }
          }}
        />
      </form>

      <button
        type="button"
        aria-pressed={showErrors}
        onClick={onToggleErrors}
        className={[
          "relative inline-flex h-[27px] w-[62px] items-center rounded-[14px] p-0 text-[12px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-point",
          showErrors ? "bg-point" : "bg-[#a9b9d6]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute left-[3px] top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/15%)] transition-transform duration-200 ease-out",
            showErrors ? "translate-x-0" : "translate-x-[35px]",
          ].join(" ")}
          aria-hidden="true"
        />
        <span
          className={[
            "absolute whitespace-nowrap transition-[left,right] duration-200",
            showErrors ? "right-[9px]" : "left-[9px]",
          ].join(" ")}
        >
          오류
        </span>
      </button>
    </div>
  );
}
