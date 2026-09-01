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
  const [sentMessages, setSentMessages] = useState<string[]>([]);

  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSentMessages((items) => [...items, trimmed]);
    setMessage("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(message);
  };

  return (
    <aside
      className="flex min-h-0 min-w-0 flex-col border-l border-[#e5e7eb] bg-[#fcfcfc] px-3 py-8 text-[#171717]"
      aria-label="AI 채팅 사이드바"
    >
      <h2 className="m-0 px-2 text-[16px] leading-7 font-bold">
        현재 웹사이트에서
        <br />
        수정하고 싶은 내용이 무엇인가요?
      </h2>

      <div className="scrollbar-subtle mt-4 min-h-0 flex-1 overflow-y-auto">
        {sentMessages.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="mt-2 ml-2 rounded-xl bg-[#eee] px-3 py-2 text-[12px] leading-5"
          >
            {item}
          </div>
        ))}
      </div>

      <ul className="mb-4 space-y-2">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => send(suggestion)}
              className="flex max-w-full items-center gap-2 rounded-full bg-[#f0f0f0] px-4 py-2.5 text-left text-[11px] font-medium hover:bg-[#e8e4ff]"
            >
              <span className="shrink-0 text-slate-500">
                <SearchIcon />
              </span>
              <span className="truncate">{suggestion}</span>
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgb(0_0_0/12%)]"
      >
        <label htmlFor="workspace-chat-input" className="sr-only">
          메시지 입력
        </label>
        <textarea
          id="workspace-chat-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(message);
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
            className="rounded-full p-1 text-xl font-light text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <PlusIcon />
          </button>
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={!message.trim()}
            className="grid size-7 place-items-center rounded-full hover:bg-[#f0edff] disabled:text-slate-300"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </aside>
  );
}
