export default function BrowserToolbar() {
  return (
    <div className="browser-toolbar">
      <div
        className="browser-actions"
        aria-hidden="true"
      >
        <span className="browser-arrow">
          ←
        </span>

        <span className="browser-arrow is-disabled">
          →
        </span>

        <span className="browser-reload">
          ↻
        </span>
      </div>

      <div className="browser-address">
        https://www.figma.com/design/
      </div>

      <button
        type="button"
        className="error-toggle"
      >
        <span className="error-toggle__switch" />
        오류 표시
      </button>
    </div>
  );
}