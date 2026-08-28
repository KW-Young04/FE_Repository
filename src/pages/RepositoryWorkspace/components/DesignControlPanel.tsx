import type { ReactNode } from "react";
import type { SelectedPreviewElement, VisualDesignValues } from "../types";

interface DesignControlPanelProps {
  selectedElement: SelectedPreviewElement | null;
  values: VisualDesignValues;
  onChange: (patch: Partial<VisualDesignValues>) => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 px-3 py-4 last:border-b-0">
      <h3 className="mb-3 text-[15px] font-bold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[11px] font-bold text-slate-700">{children}</p>;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  unit = "px",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <label className="block min-w-0">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex h-8 items-center border border-slate-200 bg-slate-50 px-2 focus-within:border-violet-400">
        <input
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-950 outline-none"
        />
        <span className="ml-1 text-[10px] font-semibold text-slate-500">{unit}</span>
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
    <label className="block w-20 shrink-0">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <div className="flex h-8 items-center border border-slate-200 bg-slate-50 px-2 focus-within:border-violet-400">
        <input
          type="number"
          min={0}
          max={100}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent text-right text-xs font-semibold text-slate-950 outline-none"
        />
        <span className="ml-1 text-[10px] font-semibold text-slate-500">%</span>
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
}: {
  label: string;
  value: string;
  percent: number;
  onColorChange: (value: string) => void;
  onPercentChange: (value: number) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-2 focus-within:border-violet-400">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#ffffff"}
            onChange={(event) => onColorChange(event.target.value)}
            className="h-4 w-5 shrink-0 border border-slate-300 bg-transparent p-0"
            aria-label={`${label} 색상`}
          />
          <span className="text-[10px] font-bold text-slate-500">#</span>
          <input
            value={value ? value.replace("#", "").toUpperCase() : "투명"}
            onChange={(event) => onColorChange(`#${event.target.value.replace(/^#/, "")}`)}
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-950 outline-none"
            aria-label={`${label} HEX 코드`}
          />
        </label>
        <PercentInput value={percent} onChange={onPercentChange} />
      </div>
    </div>
  );
}

function AlignmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 border text-[11px] font-bold ${active ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 border px-2 text-[11px] font-bold ${active ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      {label}
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
    <aside className="w-72 shrink-0 overflow-auto border-l border-slate-200 bg-white text-slate-950">
      {!selectedElement ? (
        <div className="border-b border-slate-200 px-3 py-3 text-xs font-semibold text-slate-500">
          프리뷰에서 수정할 요소를 클릭하세요.
        </div>
      ) : null}

      <div className={disabledClass}>
        <Section title="Position">
          <div className="grid gap-3">
            <div>
              <FieldLabel>Alignment</FieldLabel>
              <div className="grid grid-cols-4 gap-1">
                <AlignmentButton
                  active={values.alignment === "left"}
                  label="왼쪽"
                  onClick={() => onChange({ alignment: "left" })}
                />
                <AlignmentButton
                  active={values.alignment === "center"}
                  label="가운데"
                  onClick={() => onChange({ alignment: "center" })}
                />
                <AlignmentButton
                  active={values.alignment === "right"}
                  label="오른쪽"
                  onClick={() => onChange({ alignment: "right" })}
                />
                <AlignmentButton
                  active={values.alignment === "justify"}
                  label="양쪽"
                  onClick={() => onChange({ alignment: "justify" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="X 이동" value={values.x} onChange={(x) => onChange({ x })} />
              <NumberInput label="Y 이동" value={values.y} onChange={(y) => onChange({ y })} />
            </div>

            <div>
              <FieldLabel>Rotation</FieldLabel>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <NumberInput
                    label=""
                    value={values.rotation}
                    unit="deg"
                    onChange={(rotation) => onChange({ rotation })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <ToggleButton
                    active={values.flipH}
                    label="↔"
                    onClick={() => onChange({ flipH: !values.flipH })}
                  />
                  <ToggleButton
                    active={values.flipV}
                    label="↕"
                    onClick={() => onChange({ flipV: !values.flipV })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Layout">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="W 가로"
              value={values.width}
              min={0}
              onChange={(width) => onChange({ width })}
            />
            <NumberInput
              label="H 세로"
              value={values.height}
              min={0}
              onChange={(height) => onChange({ height })}
            />
          </div>
        </Section>

        <Section title="Appearance">
          <div className="grid grid-cols-2 gap-2">
            <PercentInput
              label="Opacity"
              value={values.opacity}
              onChange={(opacity) => onChange({ opacity })}
            />
            <NumberInput
              label="Corner radius"
              value={values.borderRadius}
              min={0}
              onChange={(borderRadius) => onChange({ borderRadius })}
            />
          </div>
        </Section>

        <Section title="Text">
          <ColorRow
            label="글자 색"
            value={values.textColor}
            percent={values.textColorOpacity}
            onColorChange={(textColor) => onChange({ textColor })}
            onPercentChange={(textColorOpacity) => onChange({ textColorOpacity })}
          />
        </Section>

        <Section title="Fill">
          <ColorRow
            label="Fill color (배경)"
            value={values.backgroundColor}
            percent={values.fillOpacity}
            onColorChange={(backgroundColor) => onChange({ backgroundColor })}
            onPercentChange={(fillOpacity) => onChange({ fillOpacity })}
          />
        </Section>

        <Section title="Stroke">
          <div className="grid gap-3">
            <ColorRow
              label="Stroke color"
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
            <NumberInput
              label="Weight"
              value={values.borderWidth}
              min={0}
              onChange={(borderWidth) => onChange({ borderWidth })}
            />
          </div>
        </Section>

        <Section title="Effects">
          <div className="grid gap-2">
            <FieldLabel>Effect type</FieldLabel>
            <div className="flex items-center gap-2">
              <label className="flex h-8 min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-2">
                <input
                  type="checkbox"
                  checked={values.dropShadow}
                  onChange={(event) => onChange({ dropShadow: event.target.checked })}
                  className="h-3 w-3"
                />
                <select
                  value={values.effectType}
                  onChange={(event) =>
                    onChange({
                      effectType: event.target.value as VisualDesignValues["effectType"],
                      dropShadow: true,
                    })
                  }
                  className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
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
            </div>
          </div>
        </Section>
      </div>
    </aside>
  );
}
