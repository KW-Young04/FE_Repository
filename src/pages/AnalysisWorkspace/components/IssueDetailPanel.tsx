export default function IssueDetailPanel() {
  return (
    <aside className="issue-detail-panel">
      <h2>선택한 이슈</h2>

      <section className="selected-issue-card">
        <div className="selected-issue-card__header">
          <span className="selected-issue-icon">
            AA
          </span>

          <div>
            <strong>
              색상 대비 실패
            </strong>

            <p>
              텍스트와 배경의 대비가
              <br />
              기준보다 낮습니다.
            </p>
          </div>

          <span className="fail-badge">
            FAIL
          </span>
        </div>
      </section>

      <section className="contrast-card">
        <div className="contrast-row">
          <span>
            현재 대비율 <em>(문제됨)</em>
          </span>

          <strong>1 : 1</strong>
        </div>

        <div className="contrast-row">
          <span>
            권장 대비 <em>(문제됨)</em>
          </span>

          <strong>1 (AA)</strong>
        </div>

        <div className="contrast-meter">
          <span />
        </div>
      </section>

      <section className="location-card">
        <h3>위치 정보</h3>

        <div>
          <code>Header.tsx</code>
          <code>.hero_text h1</code>
        </div>

        <div>
          <code>Header.tsx</code>
          <code>br</code>
        </div>
      </section>

      <section className="ai-fix-card">
        <h3>
          ✦ AI 추천 개선안
        </h3>

        <strong>
          권장 수정값
        </strong>

        <div className="color-value">
          <span>현재 색상</span>

          <span>
            <i className="color-dot color-dot--current" />
            #767676
          </span>
        </div>

        <div className="color-value">
          <span>권장 색상</span>

          <span className="recommended">
            <i className="color-dot color-dot--recommended" />
            #595959
          </span>
        </div>

        <div className="expected-ratio">
          <span>예상 대비율</span>

          <strong>
            7.0 : 1 ✓
          </strong>
        </div>

        <p>
          텍스트 색상을 더 어둡게 조정하면
          <br />
          AA·AAA 기준을 모두 충족할 수 있습니다.
        </p>

        <button type="button">
          ✦ AI 수정 실행
        </button>

        <button
          type="button"
          className="direct-edit"
        >
          코드 직접 수정
        </button>
      </section>

      <button
        type="button"
        className="guide-button"
      >
        관련 가이드
        <span>⌄</span>
      </button>
    </aside>
  );
}