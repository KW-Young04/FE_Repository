import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

interface BrowserToolbarProps {
  displayUrl: string;
  showErrors: boolean;
  onToggleErrors: () => void;
  onRefresh?: () => void;
  canNavigate?: boolean;
  onNavigate?: (input: string) => boolean;
}

export default function BrowserToolbar({
  displayUrl,
  showErrors,
  onToggleErrors,
  onRefresh,
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
      <div className="flex items-center gap-[9px] text-2xl leading-none text-slate-950">
        <span className="inline-block -translate-y-px" aria-hidden="true">
          ←
        </span>
        <span className="inline-block -translate-y-px text-slate-300" aria-hidden="true">
          →
        </span>
        <button
          type="button"
          className="inline-block -translate-y-px leading-none hover:text-[#6d3df5]"
          aria-label="미리보기 새로고침"
          onClick={onRefresh}
        >
          ↻
        </button>
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
            : "border-[#d9d9de] focus-within:ring-[#6d3df5]",
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
          "relative inline-flex h-7 w-[78px] items-center rounded-[14px] p-0 text-[12px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]",
          showErrors ? "bg-[#6d3df5]" : "bg-[#b8b0d6]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/15%)] transition-transform duration-200 ease-out",
            showErrors ? "translate-x-0" : "translate-x-[50px]",
          ].join(" ")}
          aria-hidden="true"
        />
        <span
          className={[
            "absolute whitespace-nowrap transition-[left,right] duration-200",
            showErrors ? "right-[7px]" : "left-[7px]",
          ].join(" ")}
        >
          오류 표시
        </span>
      </button>
    </div>
  );
}
