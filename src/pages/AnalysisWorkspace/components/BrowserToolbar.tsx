export default function BrowserToolbar() {
  return (
    <div className="grid h-9.75 flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#dbdbe1] bg-[#f4f4f6] px-2">
      <div
        className="flex items-center gap-2.25 text-2xl leading-none text-slate-950"
        aria-hidden="true"
      >
        <span className="inline-block -translate-y-px">
          ←
        </span>

        <span className="inline-block -translate-y-px text-slate-300">
          →
        </span>

        <span className="inline-block -translate-y-px">
          ↻
        </span>
      </div>

      <div className="flex h-6.75 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[14px] border border-[#d9d9de] bg-white px-3.25 text-xs text-[#2e3034]">
        https://www.figma.com/design/
      </div>

      <button
        type="button"
        className="inline-flex h-7 items-center gap-1.25 rounded-[14px] bg-[#6d3df5] py-0 pr-2 pl-1 text-[10px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]"
      >
        <span className="h-5.5 w-5.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/15%)]" />
        오류 표시
      </button>
    </div>
  );
}