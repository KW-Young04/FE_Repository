import { useState } from 'react';

type BottomTab =
  | 'problems'
  | 'output'
  | 'terminal';

export default function CodeBottomPanel() {
  const [activeTab, setActiveTab] =
    useState<BottomTab>('problems');

  return (
    <section className="code-bottom-panel">
      <div className="code-bottom-tabs">
        <button
          type="button"
          className={
            activeTab === 'problems'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            setActiveTab('problems')
          }
        >
          Problems
          <span className="problem-count">
            2
          </span>
        </button>

        <button
          type="button"
          className={
            activeTab === 'output'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            setActiveTab('output')
          }
        >
          Output
        </button>

        <button
          type="button"
          className={
            activeTab === 'terminal'
              ? 'is-active'
              : ''
          }
          onClick={() =>
            setActiveTab('terminal')
          }
        >
          Terminal
        </button>
      </div>

      <div className="code-bottom-content">
        {activeTab === 'problems' && (
          <div className="problem-list">
            <div className="problem-item">
              <span className="problem-icon">
                !
              </span>

              <div>
                <strong>
                  색상 대비 기준을 충족하지 못합니다.
                </strong>

                <p>
                  Header.tsx · line 4
                </p>
              </div>
            </div>

            <div className="problem-item">
              <span className="problem-icon">
                !
              </span>

              <div>
                <strong>
                  이미지 대체 텍스트가 누락되었습니다.
                </strong>

                <p>
                  Header.tsx · line 9
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="code-console">
            Accessibility analysis completed.
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="code-terminal">
            <span>$ npm run dev</span>
            <span>
              VITE ready in 341 ms
            </span>
            <span>
              Local: http://localhost:5173/
            </span>
          </div>
        )}
      </div>
    </section>
  );
}