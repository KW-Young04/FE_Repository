import Button from '@/components/Button';

export default function IssueDetailPanel() {
  const cardClasses =
    'mb-2.75 rounded-[15px] border border-[#e7e5ed] bg-white p-[13px] shadow-[0_1px_2px_rgb(10_10_20/3%)]';

  return (
    <aside className="min-h-0 overflow-y-auto border-l border-[#e7e7ec] bg-[#f7f4ff] px-3 py-3.5">
      <h2 className="mt-px mb-3.25 text-[11px] font-[760]">
        선택한 이슈
      </h2>

      <section className={cardClasses}>
        <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-2.25">
          <span className="grid size-7.75 place-items-center rounded-full bg-[#ff4f5b] text-[10px] font-[760] text-white">
            AA
          </span>

          <div>
            <strong className="mt-0.5 block text-[11px]">
              색상 대비 실패
            </strong>

            <p className="mt-2.5 mb-0 text-[9px] leading-[1.65] text-slate-400">
              텍스트와 배경의 대비가
              <br />
              기준보다 낮습니다.
            </p>
          </div>

          <span className="rounded-[9px] bg-[#ffe3e5] px-1.5 py-0.75 text-[8px] font-extrabold text-[#ff5d66]">
            FAIL
          </span>
        </div>
      </section>

      <section className={[cardClasses, 'p-3.5'].join(' ')}>
        <div className="mb-3.5 flex justify-between text-[9px] text-slate-400">
          <span>
            현재 대비율{' '}
            <em className="not-italic text-[#ff5b63]">(문제됨)</em>
          </span>

          <strong className="text-slate-700">1 : 1</strong>
        </div>

        <div className="mb-3.5 flex justify-between text-[9px] text-slate-400">
          <span>
            권장 대비{' '}
            <em className="not-italic text-[#ff5b63]">(문제됨)</em>
          </span>

          <strong className="text-slate-700">1 (AA)</strong>
        </div>

        <div className="h-0.75 rounded-[3px] bg-[#efeff2]">
          <span className="block h-full w-[8%] rounded-[inherit] bg-[#ff5963]" />
        </div>
      </section>

      <section className={cardClasses}>
        <h3 className="mt-0 mb-3 text-[9px] font-[650] text-slate-400">
          위치 정보
        </h3>

        <div className="grid grid-cols-[1fr_1.15fr] border border-slate-200">
          <code className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1.75 font-[inherit] text-[8px] text-slate-500">
            Header.tsx
          </code>
          <code className="overflow-hidden border-l border-slate-200 px-2 py-1.75 font-[inherit] text-[8px] text-ellipsis whitespace-nowrap text-slate-500">
            .hero_text h1
          </code>
        </div>

        <div className="mt-2 grid grid-cols-[1fr_1.15fr] border border-slate-200">
          <code className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1.75 font-[inherit] text-[8px] text-slate-500">
            Header.tsx
          </code>
          <code className="overflow-hidden border-l border-slate-200 px-2 py-1.75 font-[inherit] text-[8px] text-ellipsis whitespace-nowrap text-slate-500">
            br
          </code>
        </div>
      </section>

      <section className={cardClasses}>
        <h3 className="mt-0 mb-3 text-[10px] font-[650] text-[#6d3df5]">
          ✦ AI 추천 개선안
        </h3>

        <strong className="mb-2.75 block text-[9px]">
          권장 수정값
        </strong>

        <div className="mb-2.5 flex justify-between text-[8px] text-slate-400">
          <span>현재 색상</span>

          <span className="inline-flex items-center gap-1.25">
            <i className="size-2 rounded-full bg-[#767676]" />
            #767676
          </span>
        </div>

        <div className="mb-2.5 flex justify-between text-[8px] text-slate-400">
          <span>권장 색상</span>

          <span className="inline-flex items-center gap-1.25 font-[750] text-[#6d3df5]">
            <i className="size-2 rounded-full bg-[#595959]" />
            #595959
          </span>
        </div>

        <div className="mb-2.5 flex justify-between text-[8px] text-slate-400">
          <span>예상 대비율</span>

          <strong className="text-[#00a96b]">
            7.0 : 1 ✓
          </strong>
        </div>

        <p className="mt-2.75 mb-3 text-[8px] leading-[1.6] text-slate-400">
          텍스트 색상을 더 어둡게 조정하면
          <br />
          AA·AAA 기준을 모두 충족할 수 있습니다.
        </p>

        <Button
          variant="purple"
          className="h-8.25 w-full rounded text-[10px]"
        >
          ✦ AI 수정 실행
        </Button>

        <button
          type="button"
          className="mt-1.25 h-8.25 w-full cursor-pointer rounded border-0 bg-transparent text-[10px] font-[520] text-[#a4a5ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]"
        >
          코드 직접 수정
        </button>
      </section>

      <button
        type="button"
        className="flex h-9.5 w-full items-center justify-between rounded-[14px] border border-[#e8e6ed] bg-white px-3.75 text-[9px] font-[650] text-[#53555d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d3df5]"
      >
        관련 가이드
        <span>⌄</span>
      </button>
    </aside>
  );
}