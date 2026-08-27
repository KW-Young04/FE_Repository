import { useState } from 'react';

import Button from '@/components/Button';

import { groups } from '../constants';
import Icon from './Icon';
import ScoreDonut from './ScoreDonut';

export default function AnalysisSidebar() {
  const [opened, setOpened] = useState<Record<string, boolean>>({
    visual: true,
    interaction: true,
    ux: true,
  });

  return (
    <aside className="flex min-h-0 flex-col border-r border-[#e7e7ec] bg-[#f7f4ff]">
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        <ScoreDonut />

        <h3 className="m-0 bg-[#f7f4ff] px-2.5 pb-3.75 text-[11px] font-[750]">
          상세보기
        </h3>

        {groups.map((group) => (
          <section
            className="border-t border-[#e3e1e9]"
            key={group.id}
          >
            <button
              type="button"
              className="flex min-h-10.75 w-full cursor-pointer items-center gap-1.25 border-0 bg-[#f7f4ff] px-2 text-left text-[11px] font-[670] text-[#2e3037] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5]"
              onClick={() =>
                setOpened((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))
              }
              aria-expanded={opened[group.id]}
            >
              <span
                className={[
                  'inline-flex rotate-0 transition-transform duration-150',
                  opened[group.id] && 'rotate-90',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Icon
                  name="chevron"
                  size={13}
                />
              </span>

              <span>{group.title}</span>
            </button>

            {opened[group.id] && (
              <div className="bg-white">
                {group.items.map((item) => (
                  <button
                    type="button"
                    className="grid min-h-14 w-full cursor-pointer grid-cols-[minmax(0,1fr)_36px_75px] items-center border-0 border-t border-[#ededf1] bg-white py-0 pr-3 pl-10 text-left text-inherit hover:bg-[#fbfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5] max-[1360px]:pl-7"
                    key={item.id}
                  >
                    <span className="flex min-w-0 flex-col gap-px">
                      <small className="text-[9px] text-[#8c8e98]">
                        {item.id}
                      </small>
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-[560] text-[#36383f]">
                        {item.title}
                      </strong>
                    </span>

                    <span className="text-[10px] font-[750] text-[#008cff]">
                      {item.level}
                    </span>

                    <span
                      className={[
                        'justify-self-end whitespace-nowrap text-[10px] font-[650]',
                        item.status === 'Pending'
                          ? 'text-[#858791]'
                          : 'text-[#008cff]',
                      ].join(' ')}
                    >
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <Button
        variant="purple"
        className="m-2.5 h-8.25 flex-none rounded px-3 text-xs"
      >
        <Icon
          name="refresh"
          size={17}
        />
        웹 접근성 재검사
      </Button>
    </aside>
  );
}