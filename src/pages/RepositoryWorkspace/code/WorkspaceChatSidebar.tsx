import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { CHAT_SUGGESTIONS } from "./codeWorkspace";
import type {
  ChatFixEntry,
  WorkspaceChatController,
  WorkspaceChatMessage,
} from "./useWorkspaceChat";

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="5.4" cy="5.4" r="3.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M1.6 1.6L12.4 7L1.6 12.4L3.4 7L1.6 1.6Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const codeBlockClasses =
  "m-0 my-1.5 overflow-x-auto border border-slate-200 px-2 py-1.5 font-mono text-[10px] leading-4 whitespace-pre-wrap";

/** **굵게**, `코드`만 처리하는 최소 인라인 마크다운. HTML을 주입하지 않고 React 요소로 만든다. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="rounded bg-slate-100 px-1 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/** AI 답변 렌더링: ``` 코드 블록과 인라인 서식만 지원한다. */
function MessageContent({ content }: { content: string }) {
  const segments = content.split(/```[a-zA-Z]*\n?/);
  return (
    <>
      {segments.map((segment, index) =>
        index % 2 === 1 ? (
          <pre key={index} className={`${codeBlockClasses} bg-slate-50 text-slate-600`}>
            {segment.replace(/\n$/, "")}
          </pre>
        ) : (
          <span key={index} className="whitespace-pre-wrap">
            {renderInline(segment, String(index))}
          </span>
        ),
      )}
    </>
  );
}

function FixCard({ fix, onApply }: { fix: ChatFixEntry; onApply: () => void }) {
  const { state } = fix.status;
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
      <p className="m-0 mb-1 text-[11px] font-semibold text-slate-600">
        {fix.description || "수정안"}
        <span className="ml-1 font-normal text-slate-400">({fix.filePath})</span>
      </p>
      <p className="m-0 text-[10px] font-semibold text-[#ff5b63]">수정 전</p>
      <pre className={`${codeBlockClasses} bg-[#fff5f5] text-slate-600`}>{fix.before}</pre>
      <p className="m-0 text-[10px] font-semibold text-emerald-600">수정 후</p>
      <pre className={`${codeBlockClasses} bg-emerald-50 text-slate-700`}>{fix.after}</pre>

      {state === "applied" ? (
        <p className="m-0 mt-1 text-[10px] text-emerald-600">
          적용되었습니다. 재검사로 결과를 확인해 주세요.
        </p>
      ) : (
        <>
          {state === "failed" && (
            <p className="m-0 mt-1 text-[10px] text-[#ff5b63]">{fix.status.reason}</p>
          )}
          <button
            type="button"
            disabled={state === "applying"}
            onClick={onApply}
            className="mt-1.5 h-7 w-full cursor-pointer rounded border-0 bg-point text-[11px] font-semibold text-white hover:bg-point-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {state === "applying" ? "적용 중…" : state === "failed" ? "다시 적용" : "적용"}
          </button>
        </>
      )}
    </div>
  );
}

function AiMessage({
  message,
  onApplyFixes,
}: {
  message: WorkspaceChatMessage;
  onApplyFixes: (fixKeys: string[]) => void;
}) {
  const pendingKeys = message.fixes
    .filter((fix) => fix.status.state === "idle" || fix.status.state === "failed")
    .map((fix) => fix.key);

  return (
    <div className="mt-3 mr-2 text-[12px] leading-5 text-[#171717]">
      <MessageContent content={message.content} />

      {message.fixes.map((fix) => (
        <FixCard key={fix.key} fix={fix} onApply={() => onApplyFixes([fix.key])} />
      ))}

      {pendingKeys.length > 1 && (
        <button
          type="button"
          onClick={() => onApplyFixes(pendingKeys)}
          className="mt-2 h-7 w-full cursor-pointer rounded border border-point bg-white text-[11px] font-semibold text-point hover:bg-point-100"
        >
          수정안 {pendingKeys.length}건 모두 적용
        </button>
      )}
    </div>
  );
}

interface WorkspaceChatSidebarProps {
  chat?: WorkspaceChatController;
}

export default function WorkspaceChatSidebar({ chat }: WorkspaceChatSidebarProps) {
  const isChatAvailable = Boolean(chat?.isAvailable);
  const isBusy = Boolean(chat?.isSending);
  const [message, setMessage] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const messages = chat?.messages ?? [];

  // 새 메시지가 오면 맨 아래로 스크롤한다.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, isBusy]);

  const send = async (value: string) => {
    if (!chat || !isChatAvailable || isBusy) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    setMessage("");
    const ok = await chat.send(trimmed);
    // 실패하면 입력 내용을 되살려 다시 보낼 수 있게 한다.
    if (!ok) setMessage(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(message);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-8 text-[#171717]">
      <h2 className="m-0 px-2 text-[16px] leading-7 font-bold">
        현재 웹사이트에서
        <br />
        수정하고 싶은 내용이 무엇인가요?
      </h2>
      <p className="mt-2 px-2 text-xs leading-5 text-slate-500">
        {!isChatAvailable
          ? (chat?.unavailableReason ?? "AI 채팅은 준비 중입니다.")
          : chat?.activePath
            ? `열린 파일(${chat.activePath})을 기준으로 답변하고 수정안을 제안합니다.`
            : "코드 수정을 요청하려면 수정할 파일을 먼저 열어 주세요."}
      </p>

      <button
        type="button"
        disabled={!chat || messages.length === 0}
        onClick={() => {
          chat?.startNewConversation();
          setMessage("");
        }}
        className="mx-2 mt-2 self-end rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-white disabled:opacity-40"
      >
        새 대화
      </button>

      <div ref={listRef} className="scrollbar-subtle mt-4 min-h-0 flex-1 overflow-y-auto">
        {messages.map((item) =>
          item.senderType === "USER" ? (
            <div
              key={item.id}
              className="mt-2 ml-6 rounded-xl bg-[#eee] px-3 py-2 text-[12px] leading-5 whitespace-pre-wrap"
            >
              {item.content}
            </div>
          ) : (
            <AiMessage
              key={item.id}
              message={item}
              onApplyFixes={(fixKeys) => void chat?.applyFixes(item.id, fixKeys)}
            />
          ),
        )}

        {isBusy && <p className="mt-3 px-1 text-[11px] text-slate-400">AI가 답변을 작성하는 중…</p>}

        {chat?.error && (
          <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-[#fff5f5] px-3 py-2">
            <p className="m-0 text-[11px] leading-5 text-[#ff5b63]">{chat.error}</p>
            <button
              type="button"
              aria-label="오류 닫기"
              onClick={chat.clearError}
              className="shrink-0 cursor-pointer border-0 bg-transparent text-[14px] leading-none text-slate-400"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <ul className="mb-4 space-y-2">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                disabled={!isChatAvailable || isBusy}
                onClick={() => void send(suggestion)}
                className="flex max-w-full items-center gap-2 rounded-full bg-[#f0f0f0] px-4 py-2.5 text-left text-[11px] font-medium hover:bg-point-100"
              >
                <span className="shrink-0 text-slate-500">
                  <SearchIcon />
                </span>
                <span className="truncate">{suggestion}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className="shrink-0 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgb(0_0_0/12%)]"
      >
        <label htmlFor="workspace-chat-input" className="sr-only">
          메시지 입력
        </label>
        <textarea
          id="workspace-chat-input"
          disabled={!isChatAvailable}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              if (event.nativeEvent.isComposing) return;
              event.preventDefault();
              void send(message);
            }
          }}
          placeholder="메시지를 입력해주세요"
          rows={2}
          className="w-full resize-none border-0 bg-transparent text-[13px] outline-none placeholder:text-[#b4b4b4]"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="첨부 추가"
            disabled
            title="파일 첨부는 아직 제공되지 않습니다."
            className="rounded-full p-1 text-xl font-light text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <PlusIcon />
          </button>
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={!isChatAvailable || isBusy || !message.trim()}
            className="grid size-7 place-items-center rounded-full hover:bg-point-100 disabled:text-slate-300"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
