interface BrowserToolbarProps {
  displayUrl: string;
  showErrors: boolean;
  onToggleErrors: () => void;
  onRefresh?: () => void;
}

export default function BrowserToolbar({
  displayUrl,
  showErrors,
  onToggleErrors,
  onRefresh,
}: BrowserToolbarProps) {
  return (
    <div className="grid h-[39px] flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#dbdbe1] bg-[#f4f4f6] px-2">
      <div
        className="flex items-center gap-[9px] text-2xl leading-none text-slate-950"
        aria-hidden="true"
      >
        <span className="inline-block -translate-y-px">←</span>
        <span className="inline-block -translate-y-px text-slate-300">→</span>
        <button
          type="button"
          className="inline-block -translate-y-px leading-none hover:text-[#6d3df5]"
          aria-label="미리보기 새로고침"
          onClick={onRefresh}
        >
          ↻
        </button>
      </div>

      <div className="flex h-[27px] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[14px] border border-[#d9d9de] bg-white px-[13px] text-xs text-[#2e3034]">
        {displayUrl}
      </div>

      <button
        type="button"
        aria-pressed={showErrors}
        onClick={onToggleErrors}
        className={[
          "relative inline-flex h-7 w-[78px] items-center rounded-[14px] p-0 text-[12px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]",
          showErrors ? "bg-[#6d3df5]" : "bg-[#b8b0d6]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute left-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/15%)] transition-transform duration-200 ease-out",
            showErrors ? "translate-x-0" : "translate-x-[50px]",
          ].join(" ")}
          aria-hidden="true"
        />
        <span
          className={[
            "absolute whitespace-nowrap transition-[left,right] duration-200",
            showErrors ? "right-[7px]" : "left-[7px]",
          ].join(" ")}
        >
          오류 표시
        </span>
      </button>
    </div>
  );
}
