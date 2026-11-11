import type { ReactNode } from "react";
import type { SelectedPreviewElement, VisualDesignValues } from "../types";

interface DesignControlPanelProps {
  selectedElement: SelectedPreviewElement | null;
  values: VisualDesignValues;
  onChange: (patch: Partial<VisualDesignValues>) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-3 min-w-0 border-b border-[#F0F0F0] py-2.5">
      <h3 className="mb-2.5 text-sm font-bold tracking-tight text-black">{title}</h3>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold text-black">{children}</p>;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  unit = "",
  prefix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  prefix?: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex h-[26px] items-center rounded-sm border border-transparent bg-[#F5F6FA] px-[7px] focus-within:border-point focus-within:bg-white">
        {prefix ? (
          <span className="mr-2 flex w-3.5 shrink-0 items-center justify-center text-[11px] text-black">
            {prefix}
          </span>
        ) : null}
        <input
          aria-label={label || (typeof prefix === "string" ? prefix : "값")}
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) =>
            onChange(
              Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Number(event.target.value))),
            )
          }
          className="w-0 min-w-0 flex-1 appearance-none bg-transparent p-0 text-[11px] text-black outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="ml-1 text-[10px] text-slate-500">{unit}</span>
      </div>
    </label>
  );
}

function PercentInput({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={label ? "block min-w-0" : "block w-[55px] shrink-0"}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex h-[26px] items-center rounded-sm border border-transparent bg-[#F5F6FA] px-[7px] focus-within:border-point focus-within:bg-white">
        <input
          type="number"
          min={0}
          max={100}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Math.min(100, Math.max(0, Number(event.target.value))))}
          className="w-0 min-w-0 flex-1 appearance-none bg-transparent p-0 text-right text-[11px] text-black outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="ml-1 text-[10px] text-slate-500">%</span>
      </div>
    </label>
  );
}

function ColorRow({
  label,
  value,
  percent,
  onColorChange,
  onPercentChange,
  onRemove,
}: {
  label: string;
  value: string;
  percent: number;
  onColorChange: (value: string) => void;
  onPercentChange: (value: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label className="flex h-[26px] min-w-0 flex-1 items-center gap-1.5 rounded-sm bg-[#F5F6FA] px-1.5 focus-within:ring-2 focus-within:ring-point/40">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#ffffff"}
            onChange={(event) => onColorChange(event.target.value)}
            className="h-3.5 w-3.5 shrink-0 cursor-pointer border-0 bg-transparent p-0 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0"
            aria-label={`${label} 색상`}
          />
          <input
            value={value ? value.replace("#", "").toUpperCase() : "투명"}
            onChange={(event) => onColorChange(`#${event.target.value.replace(/^#/, "")}`)}
            className="w-0 min-w-0 flex-1 bg-transparent text-[11px] text-black outline-none"
            aria-label={`${label} HEX 코드`}
          />
        </label>
        <PercentInput label={undefined} value={percent} onChange={onPercentChange} />
        {onRemove ? <RemoveButton label={`${label} 제거`} onClick={onRemove} /> : null}
      </div>
    </div>
  );
}

type AlignmentIconType = "left" | "center" | "right" | "top" | "middle" | "bottom";

function AlignmentIcon({ type }: { type: AlignmentIconType }) {
  const horizontal = type === "left" || type === "center" || type === "right";
  const shortLineX = type === "left" ? 2 : type === "right" ? 10 : 6;

  return (
    <svg width="16" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {horizontal ? (
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M2 3h20M2 12h20M2 21h20" />
          <path d={`M${shortLineX} 7.5h12M${shortLineX} 16.5h12`} />
        </g>
      ) : (
        <>
          <path
            d={type === "top" ? "M1 1h22" : type === "bottom" ? "M1 23h22" : "M1 12h22"}
            stroke="currentColor"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y={type === "top" ? 3 : type === "bottom" ? 6 : 2}
            width="5.5"
            height={type === "middle" ? 20 : 15}
          />
          <rect
            x="14"
            y={type === "top" ? 3 : type === "bottom" ? 1 : 4.5}
            width="5.5"
            height={type === "middle" ? 15 : 20}
          />
        </>
      )}
    </svg>
  );
}

function AlignmentButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: AlignmentIconType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[26px] w-full items-center justify-center rounded-sm hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-point ${active ? "bg-point-50 text-point" : "bg-[#F5F6FA] text-black"}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <AlignmentIcon type={icon} />
    </button>
  );
}

type ControlIconType =
  "rotation" | "rotate" | "flipH" | "flipV" | "opacity" | "corner" | "weight" | "effect";

function ControlIcon({ type }: { type: ControlIconType }) {
  const paths: Record<ControlIconType, ReactNode> = {
    rotation: (
      <>
        <path d="M3 19h18M4 18 15 5M8 13a7 7 0 0 1 3 6" />
      </>
    ),
    rotate: (
      <>
        <path d="M5 14V9a5 5 0 0 1 5-5h7m-3-3 4 3-4 3" />
        <rect x="9" y="11" width="11" height="9" rx="1.5" />
      </>
    ),
    flipH: (
      <>
        <path d="M12 2v3m0 3v3m0 3v3m0 3v2" />
        <path d="m3 6 6 6-6 6Zm18 0-6 6 6 6Z" fill="currentColor" stroke="none" />
      </>
    ),
    flipV: (
      <>
        <path d="M2 12h3m3 0h3m3 0h3m3 0h2" />
        <path d="m6 3 6 6 6-6Zm0 18 6-6 6 6Z" fill="currentColor" stroke="none" />
      </>
    ),
    opacity: (
      <>
        <circle cx="9" cy="9" r="6" />
        <circle cx="15" cy="15" r="6" strokeDasharray="2 2" />
      </>
    ),
    corner: (
      <>
        <path d="M3 21V5a2 2 0 0 1 2-2h16v8H11v10Z" />
        <path d="M11 11V3" />
      </>
    ),
    weight: (
      <>
        <path d="M2 3h20M2 6h20M2 10h20" />
        <path d="M2 14h20v7H2Z" fill="currentColor" stroke="none" />
      </>
    ),
    effect: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
      </>
    ),
  };
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-[26px] w-5 shrink-0 items-center justify-center rounded-sm text-black hover:bg-slate-100 focus-visible:outline-point"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 8h12" stroke="currentColor" />
      </svg>
    </button>
  );
}

function ToggleButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ControlIconType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-[26px] min-w-0 items-center justify-center rounded-sm hover:bg-slate-200 focus-visible:outline-point ${active ? "bg-point-50 text-point" : "bg-[#F5F6FA] text-black"}`}
    >
      <ControlIcon type={icon} />
    </button>
  );
}

export default function DesignControlPanel({
  selectedElement,
  values,
  onChange,
}: DesignControlPanelProps) {
  const disabledClass = selectedElement ? "" : "pointer-events-none opacity-45";

  return (
    <div className="w-full min-w-0 bg-white text-slate-950">
      {!selectedElement ? (
        <div className="border-b border-slate-200 px-3 py-3 text-xs font-semibold text-slate-500">
          프리뷰에서 수정할 요소를 클릭하세요.
        </div>
      ) : null}

      <fieldset disabled={!selectedElement} className={`m-0 min-w-0 border-0 p-0 ${disabledClass}`}>
        <Section title="Position">
          <div className="grid min-w-0 gap-2">
            <div>
              <FieldLabel>Alignment</FieldLabel>
              <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_1px_repeat(3,minmax(0,1fr))] gap-1">
                <AlignmentButton
                  active={values.alignment === "left"}
                  label="왼쪽 정렬"
                  icon="left"
                  onClick={() => onChange({ alignment: "left" })}
                />
                <AlignmentButton
                  active={values.alignment === "center"}
                  label="가운데 정렬"
                  icon="center"
                  onClick={() => onChange({ alignment: "center" })}
                />
                <AlignmentButton
                  active={values.alignment === "right"}
                  label="오른쪽 정렬"
                  icon="right"
                  onClick={() => onChange({ alignment: "right" })}
                />
                <span aria-hidden="true" />
                <AlignmentButton
                  active={values.verticalAlignment === "top"}
                  label="위쪽 정렬"
                  icon="top"
                  onClick={() => onChange({ verticalAlignment: "top" })}
                />
                <AlignmentButton
                  active={values.verticalAlignment === "middle"}
                  label="세로 가운데 정렬"
                  icon="middle"
                  onClick={() => onChange({ verticalAlignment: "middle" })}
                />
                <AlignmentButton
                  active={values.verticalAlignment === "bottom"}
                  label="아래쪽 정렬"
                  icon="bottom"
                  onClick={() => onChange({ verticalAlignment: "bottom" })}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Position</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <NumberInput
                  label=""
                  prefix="X"
                  value={values.x}
                  onChange={(x) => onChange({ x })}
                />
                <NumberInput
                  label=""
                  prefix="Y"
                  value={values.y}
                  onChange={(y) => onChange({ y })}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Rotation</FieldLabel>
              <div className="grid grid-cols-2 items-end gap-2">
                <div className="min-w-0 flex-1">
                  <NumberInput
                    label=""
                    value={values.rotation}
                    prefix={<ControlIcon type="rotation" />}
                    onChange={(rotation) => onChange({ rotation })}
                  />
                </div>
                <div className="grid min-w-0 grid-cols-3 gap-[3px]">
                  <ToggleButton
                    active={false}
                    label="90도 회전"
                    icon="rotate"
                    onClick={() => onChange({ rotation: (values.rotation + 90) % 360 })}
                  />
                  <ToggleButton
                    active={values.flipH}
                    label="좌우 반전"
                    icon="flipH"
                    onClick={() => onChange({ flipH: !values.flipH })}
                  />
                  <ToggleButton
                    active={values.flipV}
                    label="상하 반전"
                    icon="flipV"
                    onClick={() => onChange({ flipV: !values.flipV })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Layout">
          <FieldLabel>Dimensions</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label=""
              prefix="W"
              value={values.width}
              min={0}
              onChange={(width) => onChange({ width })}
            />
            <NumberInput
              label=""
              prefix="H"
              value={values.height}
              min={0}
              onChange={(height) => onChange({ height })}
            />
          </div>
        </Section>

        <Section title="Appearance">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="Opacity"
              prefix={<ControlIcon type="opacity" />}
              min={0}
              max={100}
              value={values.opacity}
              onChange={(opacity) => onChange({ opacity })}
            />
            <NumberInput
              label="Corner radius"
              prefix={<ControlIcon type="corner" />}
              value={values.borderRadius}
              min={0}
              onChange={(borderRadius) => onChange({ borderRadius })}
            />
          </div>
        </Section>

        <Section title="Text">
          <ColorRow
            label="글자 색"
            onRemove={() => onChange({ textColorOpacity: 0 })}
            value={values.textColor}
            percent={values.textColorOpacity}
            onColorChange={(textColor) => onChange({ textColor })}
            onPercentChange={(textColorOpacity) => onChange({ textColorOpacity })}
          />
        </Section>

        <Section title="Fill">
          <ColorRow
            label="Fill"
            onRemove={() => onChange({ fillOpacity: 0 })}
            value={values.backgroundColor}
            percent={values.fillOpacity}
            onColorChange={(backgroundColor) => onChange({ backgroundColor })}
            onPercentChange={(fillOpacity) => onChange({ fillOpacity })}
          />
        </Section>

        <Section title="Stroke">
          <div className="grid min-w-0 gap-2">
            <ColorRow
              label="Stroke"
              onRemove={() => onChange({ borderWidth: 0, strokeOpacity: 0 })}
              value={values.borderColor}
              percent={values.strokeOpacity}
              onColorChange={(borderColor) =>
                onChange({ borderColor, ...(values.borderWidth === 0 ? { borderWidth: 1 } : null) })
              }
              onPercentChange={(strokeOpacity) =>
                onChange({
                  strokeOpacity,
                  ...(values.borderWidth === 0 ? { borderWidth: 1 } : null),
                })
              }
            />
            <div className="w-[calc(50%-4px)]">
              <NumberInput
                label="Weight"
                prefix={<ControlIcon type="weight" />}
                value={values.borderWidth}
                min={0}
                onChange={(borderWidth) => onChange({ borderWidth })}
              />
            </div>
          </div>
        </Section>

        <Section title="Effects">
          <div className="grid gap-2">
            <div className="flex items-center gap-1.5">
              <label className="flex h-[26px] min-w-0 flex-1 items-center gap-2 rounded-sm border border-slate-100 bg-white px-1.5">
                <input
                  type="checkbox"
                  checked={values.dropShadow}
                  onChange={(event) => onChange({ dropShadow: event.target.checked })}
                  aria-label="효과 활성화"
                  className="peer sr-only"
                />
                <span className="shrink-0 peer-focus-visible:outline-2 peer-focus-visible:outline-point">
                  <ControlIcon type="effect" />
                </span>
                <select
                  aria-label="효과 종류"
                  value={values.effectType}
                  onChange={(event) =>
                    onChange({
                      effectType: event.target.value as VisualDesignValues["effectType"],
                      dropShadow: true,
                    })
                  }
                  className="w-0 min-w-0 flex-1 bg-transparent text-[11px] outline-none"
                >
                  <option value="drop-shadow">Drop shadow</option>
                  <option value="inner-shadow">Inner shadow</option>
                  <option value="layer-blur">Layer blur</option>
                </select>
              </label>
              <PercentInput
                value={values.effectOpacity}
                onChange={(effectOpacity) =>
                  onChange({ effectOpacity, dropShadow: effectOpacity > 0 })
                }
              />
              <RemoveButton
                label="효과 제거"
                onClick={() => onChange({ dropShadow: false, effectOpacity: 0 })}
              />
            </div>
          </div>
        </Section>
      </fieldset>
    </div>
  );
}
