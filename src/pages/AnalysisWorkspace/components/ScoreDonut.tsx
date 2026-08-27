export default function ScoreDonut() {
  return (
    <div className="mx-2 mt-2.25 mb-14.25 min-h-41.5 rounded-[15px] border border-[#e9e8ee] bg-white px-3.5 pt-3.5 pb-3 shadow-[0_1px_2px_rgb(23_23_28/3%)] max-[1360px]:mb-9">
      <h2 className="mt-0 mb-2.25 text-[11px] font-[760]">
        웹 접근성 검사 점수
      </h2>

      <div className="mb-2.25 h-px bg-[#ececf0]" />

      <div className="flex items-center justify-center gap-5">
        <div
          className="grid size-25.5 rotate-[36deg] place-items-center rounded-full bg-[conic-gradient(#0fc3cd_0_45%,#1a8ff0_45%_60%,#bfe4ff_60%_100%)]"
          aria-label="웹 접근성 점수 60점"
        >
          <div className="grid size-16.75 -rotate-[36deg] place-items-center rounded-full bg-white text-lg font-[780] text-slate-950">
            60점
          </div>
        </div>

        <div className="grid gap-2.75 whitespace-nowrap text-[10px] font-[650]">
          <div className="flex items-center gap-1.75">
            <span className="size-2.5 rounded-full border-[3px] border-[#0fc3cd]" />
            시각 품질
          </div>

          <div className="flex items-center gap-1.75">
            <span className="size-2.5 rounded-full border-[3px] border-[#bfe4ff]" />
            구조/동작 품질
          </div>

          <div className="flex items-center gap-1.75">
            <span className="size-2.5 rounded-full border-[3px] border-[#1a8ff0]" />
            전체 경험
          </div>
        </div>
      </div>
    </div>
  );
}