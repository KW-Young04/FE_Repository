import { useState, type FormEvent } from "react";

import { CHAT_SUGGESTIONS } from "../../data/codeWorkspace";

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

export default function WorkspaceChatSidebar() {
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;

    setMessage("");
  };

  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-[#F7F7FB] px-4 py-5"
      aria-label="AI 채팅 사이드바"
    >
      <h2 className="text-[13px] leading-6 font-bold text-slate-900">
        현재 웹사이트에서
        <br />
        수정하고 싶은 내용이 무엇인가요?
      </h2>

      <div className="min-h-0 flex-1" />

      <ul className="space-y-2">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => setMessage(suggestion)}
              className="flex w-full items-center gap-2 rounded-full bg-slate-200/70 px-3 py-2 text-left text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              <span className="shrink-0 text-slate-500">
                <SearchIcon />
              </span>
              <span className="truncate">{suggestion}</span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="workspace-chat-input" className="sr-only">
            메시지 입력
          </label>
          <input
            id="workspace-chat-input"
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="메시지를 입력해주세요"
            className="min-w-0 flex-1 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={!message.trim()}
            className="shrink-0 rounded-full p-1 text-slate-800 hover:bg-slate-100 disabled:text-slate-300"
          >
            <SendIcon />
          </button>
        </div>

        <div className="mt-3 flex items-center">
          <button
            type="button"
            aria-label="첨부 추가"
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <PlusIcon />
          </button>
        </div>
      </form>
    </aside>
  );
}
