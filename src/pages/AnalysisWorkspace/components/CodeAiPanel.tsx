import { useState } from 'react';

type ChatMessage = {
  id: number;
  role: 'ai' | 'user';
  text: string;
};

export default function CodeAiPanel() {
  const [input, setInput] = useState('');

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: 1,
        role: 'ai',
        text:
          '선택된 코드에서 색상 대비와 대체 텍스트 문제를 발견했습니다. 원하는 부분을 말씀해주시면 수정안을 제안할게요.',
      },
    ]);

  const handleSend = () => {
    const value = input.trim();

    if (!value) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'user',
        text: value,
      },
    ]);

    setInput('');
  };

  return (
    <aside className="code-ai-panel">
      <div className="code-ai-panel__header">
        <div>
          <span className="code-ai-icon">
            ✦
          </span>

          <strong>
            codee AI
          </strong>
        </div>

        <button
          type="button"
          aria-label="새 채팅"
        >
          +
        </button>
      </div>

      <div className="code-ai-context">
        <span>현재 파일</span>

        <strong>
          Header.tsx
        </strong>
      </div>

      <div className="code-ai-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`code-ai-message code-ai-message--${message.role}`}
          >
            {message.role === 'ai' && (
              <span className="code-ai-message__avatar">
                ✦
              </span>
            )}

            <div>
              {message.text}
            </div>
          </div>
        ))}

        <div className="code-ai-suggestion">
          <strong>
            추천 수정
          </strong>

          <pre>
{`color: #595959;

<img
  src="/hero.png"
  alt="광운대학교 캠퍼스"
/>`}
          </pre>

          <button type="button">
            코드에 적용
          </button>
        </div>
      </div>

      <div className="code-ai-input">
        <textarea
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          placeholder="코드에 대해 질문하거나 수정 요청을 입력하세요."
        />

        <div className="code-ai-input__footer">
          <span>
            선택한 코드 기준
          </span>

          <button
            type="button"
            onClick={handleSend}
          >
            ↑
          </button>
        </div>
      </div>
    </aside>
  );
}