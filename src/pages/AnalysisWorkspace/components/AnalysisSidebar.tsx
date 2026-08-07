import { useState } from 'react';

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
    <aside className="analysis-sidebar">
      <div className="analysis-sidebar__scroll">
        <ScoreDonut />

        <h3 className="sidebar-title">
          상세보기
        </h3>

        {groups.map((group) => (
          <section
            className="check-group"
            key={group.id}
          >
            <button
              type="button"
              className="check-group__header"
              onClick={() =>
                setOpened((current) => ({
                  ...current,
                  [group.id]: !current[group.id],
                }))
              }
              aria-expanded={opened[group.id]}
            >
              <span
                className={
                  opened[group.id]
                    ? 'group-arrow is-open'
                    : 'group-arrow'
                }
              >
                <Icon
                  name="chevron"
                  size={13}
                />
              </span>

              <span>{group.title}</span>
            </button>

            {opened[group.id] && (
              <div className="check-group__items">
                {group.items.map((item) => (
                  <button
                    type="button"
                    className="check-row"
                    key={item.id}
                  >
                    <span className="check-row__name">
                      <small>{item.id}</small>
                      <strong>{item.title}</strong>
                    </span>

                    <span className="check-row__level">
                      {item.level}
                    </span>

                    <span
                      className={`check-row__status status-${item.status
                        .toLowerCase()
                        .replace(' ', '-')}`}
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

      <button
        className="recheck-button"
        type="button"
      >
        <Icon
          name="refresh"
          size={17}
        />
        웹 접근성 재검사
      </button>
    </aside>
  );
}