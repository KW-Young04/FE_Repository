import { useState } from 'react';

export default function DesignToolPanel() {
  const [x, setX] = useState(769);
  const [y, setY] = useState(769);

  const [rotation, setRotation] = useState(0);

  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(20);

  const [opacity, setOpacity] = useState(20);
  const [radius, setRadius] = useState(20);

  const [fill, setFill] = useState('#FFFFFF');
  const [fillOpacity, setFillOpacity] = useState(100);

  const [stroke, setStroke] = useState('#000000');
  const [strokeOpacity, setStrokeOpacity] = useState(100);
  const [strokeWeight, setStrokeWeight] = useState(1);

  const [effectEnabled, setEffectEnabled] = useState(true);

  return (
    <aside className="design-tool-panel">
      {/* Position */}
      <section className="design-tool-section">
        <h2 className="design-tool-section__title">
          Position
        </h2>

        <div className="design-tool-label">
          Alignment
        </div>

        <div className="alignment-tools">
          <button type="button" title="왼쪽 정렬">
            ≡
          </button>

          <button type="button" title="가운데 정렬">
            ≣
          </button>

          <button type="button" title="오른쪽 정렬">
            ≡
          </button>

          <span className="alignment-divider" />

          <button type="button" title="위쪽 정렬">
            ⫯
          </button>

          <button type="button" title="세로 가운데 정렬">
            ⫰
          </button>

          <button type="button" title="아래쪽 정렬">
            ⫯
          </button>
        </div>

        <div className="design-field-row">
          <DesignNumberField
            label="X"
            value={x}
            onChange={setX}
          />

          <DesignNumberField
            label="Y"
            value={y}
            onChange={setY}
          />
        </div>

        <div className="design-tool-label design-tool-label--spacing">
          Rotation
        </div>

        <div className="rotation-row">
          <DesignNumberField
            label="↙"
            value={rotation}
            onChange={setRotation}
          />

          <div className="rotation-actions">
            <button type="button" title="잠금">
              ♙
            </button>

            <button type="button" title="좌우 반전">
              ↔
            </button>

            <button type="button" title="상하 반전">
              ↕
            </button>
          </div>
        </div>
      </section>

      {/* Layout */}
      <section className="design-tool-section">
        <h2 className="design-tool-section__title">
          Layout
        </h2>

        <div className="design-tool-label">
          Dimensions
        </div>

        <div className="design-field-row">
          <DesignNumberField
            label="W"
            value={width}
            onChange={setWidth}
          />

          <DesignNumberField
            label="H"
            value={height}
            onChange={setHeight}
          />
        </div>
      </section>

      {/* Appearance */}
      <section className="design-tool-section">
        <h2 className="design-tool-section__title">
          Appearance
        </h2>

        <div className="design-field-row">
          <DesignNumberField
            label="◐"
            value={opacity}
            suffix="%"
            onChange={setOpacity}
          />

          <DesignNumberField
            label="⌜"
            value={radius}
            onChange={setRadius}
          />
        </div>

        <div className="design-field-caption-row">
          <span>Opacity</span>
          <span>Corner radius</span>
        </div>
      </section>

      {/* Fill */}
      <section className="design-tool-section">
        <h2 className="design-tool-section__title">
          Fill
        </h2>

        <ColorControl
          color={fill}
          opacity={fillOpacity}
          onColorChange={setFill}
          onOpacityChange={setFillOpacity}
        />
      </section>

      {/* Stroke */}
      <section className="design-tool-section">
        <h2 className="design-tool-section__title">
          Stroke
        </h2>

        <ColorControl
          color={stroke}
          opacity={strokeOpacity}
          onColorChange={setStroke}
          onOpacityChange={setStrokeOpacity}
        />

        <div className="design-tool-label design-tool-label--spacing">
          Weight
        </div>

        <div className="stroke-weight-row">
          <input
            type="number"
            value={strokeWeight}
            min={0}
            onChange={(event) =>
              setStrokeWeight(Number(event.target.value))
            }
          />
        </div>
      </section>

      {/* Effects */}
      <section className="design-tool-section">
        <h2 className="design-tool-section__title">
          Effects
        </h2>

        <div className="effect-row">
          <button
            type="button"
            className={
              effectEnabled
                ? 'effect-toggle is-active'
                : 'effect-toggle'
            }
            onClick={() =>
              setEffectEnabled((current) => !current)
            }
            aria-label="Drop shadow 활성화"
          >
            ◐
          </button>

          <select
            defaultValue="drop-shadow"
            disabled={!effectEnabled}
          >
            <option value="drop-shadow">
              Drop shadow
            </option>

            <option value="inner-shadow">
              Inner shadow
            </option>

            <option value="blur">
              Blur
            </option>
          </select>

          <div className="effect-opacity">
            100 %
          </div>
        </div>
      </section>
    </aside>
  );
}

/* 숫자 입력 공통 */

interface DesignNumberFieldProps {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function DesignNumberField({
  label,
  value,
  suffix,
  onChange,
}: DesignNumberFieldProps) {
  return (
    <label className="design-number-field">
      <span>{label}</span>

      <input
        type="number"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
      />

      {suffix && (
        <small>
          {suffix}
        </small>
      )}
    </label>
  );
}

/* 색상 입력 공통 */

interface ColorControlProps {
  color: string;
  opacity: number;
  onColorChange: (value: string) => void;
  onOpacityChange: (value: number) => void;
}

function ColorControl({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
}: ColorControlProps) {
  return (
    <div className="color-control">
      <label className="color-control__main">
        <input
          type="color"
          value={color}
          onChange={(event) =>
            onColorChange(event.target.value.toUpperCase())
          }
        />

        <input
          type="text"
          value={color}
          onChange={(event) =>
            onColorChange(event.target.value)
          }
        />
      </label>

      <label className="color-control__opacity">
        <input
          type="number"
          min={0}
          max={100}
          value={opacity}
          onChange={(event) =>
            onOpacityChange(Number(event.target.value))
          }
        />

        <span>%</span>
      </label>

      <button
        type="button"
        className="color-control__remove"
        aria-label="색상 제거"
      >
        −
      </button>
    </div>
  );
}