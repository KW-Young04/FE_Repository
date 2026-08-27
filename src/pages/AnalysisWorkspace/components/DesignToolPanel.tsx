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
    <aside className="h-full min-w-0 w-full overflow-y-auto border-l border-slate-200 bg-white text-slate-800">
      {/* Position */}
      <section className="border-b border-slate-200 px-3 pt-3.5 pb-4">
        <h2 className="mb-3.5 text-sm font-bold text-slate-900">
          Position
        </h2>

        <div className="mb-1.5 text-[11px] font-semibold text-slate-700">
          Alignment
        </div>

        <div className="mb-3 grid grid-cols-[repeat(3,minmax(0,1fr))_1px_repeat(3,minmax(0,1fr))] gap-1">
          <button type="button" title="왼쪽 정렬" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
            ≡
          </button>

          <button type="button" title="가운데 정렬" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
            ≣
          </button>

          <button type="button" title="오른쪽 정렬" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
            ≡
          </button>

          <span className="h-[18px] w-px self-center bg-slate-300" />

          <button type="button" title="위쪽 정렬" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
            ⫯
          </button>

          <button type="button" title="세로 가운데 정렬" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
            ⫰
          </button>

          <button type="button" title="아래쪽 정렬" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
            ⫯
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
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

        <div className="mt-3 mb-1.5 text-[11px] font-semibold text-slate-700">
          Rotation
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DesignNumberField
            label="↙"
            value={rotation}
            onChange={setRotation}
          />

          <div className="grid grid-cols-3 gap-[3px]">
            <button type="button" title="잠금" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
              ♙
            </button>

            <button type="button" title="좌우 반전" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
              ↔
            </button>

            <button type="button" title="상하 반전" className="h-[27px] cursor-pointer rounded-sm p-0 text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]">
              ↕
            </button>
          </div>
        </div>
      </section>

      {/* Layout */}
      <section className="border-b border-slate-200 px-3 pt-3.5 pb-4">
        <h2 className="mb-3.5 text-sm font-bold text-slate-900">
          Layout
        </h2>

        <div className="mb-1.5 text-[11px] font-semibold text-slate-700">
          Dimensions
        </div>

        <div className="grid grid-cols-2 gap-2">
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
      <section className="border-b border-slate-200 px-3 pt-3.5 pb-4">
        <h2 className="mb-3.5 text-sm font-bold text-slate-900">
          Appearance
        </h2>

        <div className="grid grid-cols-2 gap-2">
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

        <div className="mt-1 grid grid-cols-2 gap-2 text-[9px] text-slate-500">
          <span>Opacity</span>
          <span>Corner radius</span>
        </div>
      </section>

      {/* Fill */}
      <section className="border-b border-slate-200 px-3 pt-3.5 pb-4">
        <h2 className="mb-3.5 text-sm font-bold text-slate-900">
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
      <section className="border-b border-slate-200 px-3 pt-3.5 pb-4">
        <h2 className="mb-3.5 text-sm font-bold text-slate-900">
          Stroke
        </h2>

        <ColorControl
          color={stroke}
          opacity={strokeOpacity}
          onColorChange={setStroke}
          onOpacityChange={setStrokeOpacity}
        />

        <div className="mt-3 mb-1.5 text-[11px] font-semibold text-slate-700">
          Weight
        </div>

        <div>
          <input
            className="h-[29px] w-full appearance-none rounded-sm border-0 bg-slate-100 px-2 text-[11px] text-slate-700 outline-none focus:ring-2 focus:ring-[#7d61ff]/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
      <section className="border-b border-slate-200 px-3 pt-3.5 pb-4">
        <h2 className="mb-3.5 text-sm font-bold text-slate-900">
          Effects
        </h2>

        <div className="grid grid-cols-[25px_minmax(0,1fr)_55px] items-center gap-[5px]">
          <button
            type="button"
            className={`h-[27px] w-[25px] cursor-pointer rounded-sm p-0 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff] ${
              effectEnabled ? 'text-slate-800' : 'text-slate-400'
            }`}
            onClick={() =>
              setEffectEnabled((current) => !current)
            }
            aria-label="Drop shadow 활성화"
          >
            ◐
          </button>

          <select
            className="h-[29px] w-full rounded-sm border-0 bg-slate-100 px-1.5 text-[10px] text-slate-700 outline-none focus:ring-2 focus:ring-[#7d61ff]/40 disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="flex h-[29px] items-center justify-center rounded-sm bg-slate-100 text-[9px] text-slate-600">
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
    <label className="flex h-[29px] min-w-0 items-center rounded-sm border border-transparent bg-slate-100 px-[7px] focus-within:border-[#7d61ff] focus-within:bg-white">
      <span className="mr-1.5 shrink-0 text-[10px] text-slate-500">{label}</span>

      <input
        className="w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-[11px] text-slate-700 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        type="number"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
      />

      {suffix && (
        <small className="text-[10px] text-slate-500">
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
    <div className="grid grid-cols-[minmax(0,1fr)_55px_22px] items-center gap-1.5">
      <label className="flex h-[29px] min-w-0 items-center rounded-sm bg-slate-100 px-1.5 focus-within:ring-2 focus-within:ring-[#7d61ff]/40">
        <input
          className="h-3.5 w-3.5 shrink-0 cursor-pointer border-0 bg-transparent p-0 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0"
          type="color"
          value={color}
          onChange={(event) =>
            onColorChange(event.target.value.toUpperCase())
          }
        />

        <input
          className="ml-1.5 w-full min-w-0 border-0 bg-transparent p-0 text-[10px] text-slate-700 outline-none"
          type="text"
          value={color}
          onChange={(event) =>
            onColorChange(event.target.value)
          }
        />
      </label>

      <label className="flex h-[29px] items-center rounded-sm bg-slate-100 px-[5px] focus-within:ring-2 focus-within:ring-[#7d61ff]/40">
        <input
          className="w-full appearance-none border-0 bg-transparent p-0 text-[10px] text-slate-700 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          type="number"
          min={0}
          max={100}
          value={opacity}
          onChange={(event) =>
            onOpacityChange(Number(event.target.value))
          }
        />

        <span className="text-[9px] text-slate-500">%</span>
      </label>

      <button
        type="button"
        className="h-[27px] cursor-pointer rounded-sm border-0 bg-transparent p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#7d61ff]"
        aria-label="색상 제거"
      >
        −
      </button>
    </div>
  );
}