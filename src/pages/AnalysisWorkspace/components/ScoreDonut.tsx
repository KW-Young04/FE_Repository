export default function ScoreDonut() {
  return (
    <div className="score-card">
      <h2>웹 접근성 검사 점수</h2>

      <div className="score-card__divider" />

      <div className="score-card__content">
        <div
          className="score-donut"
          aria-label="웹 접근성 점수 60점"
        >
          <div className="score-donut__inner">
            60점
          </div>
        </div>

        <div className="score-legend">
          <div>
            <span className="legend-dot legend-dot--visual" />
            시각 품질
          </div>

          <div>
            <span className="legend-dot legend-dot--structure" />
            구조/동작 품질
          </div>

          <div>
            <span className="legend-dot legend-dot--ux" />
            전체 경험
          </div>
        </div>
      </div>
    </div>
  );
}