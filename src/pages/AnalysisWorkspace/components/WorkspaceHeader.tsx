import Button from '@/components/Button';

import type { TabKey } from '../types';
import Icon from './Icon';

interface WorkspaceHeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export default function WorkspaceHeader({
  activeTab,
  onTabChange,
}: WorkspaceHeaderProps) {
  const tabClasses = (tab: TabKey) =>
    [
      "relative inline-flex h-10.5 cursor-pointer items-center gap-1.25 border-0 px-[17px] text-[13px] font-[650] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[#6d3df5] after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d3df5]",
      activeTab === tab
        ? 'bg-[#f7f4ff] text-[#6d3df5] after:scale-x-100'
        : 'bg-transparent text-[#9699a5] after:scale-x-0',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <header className="relative z-20 grid h-10.5 grid-cols-[298px_minmax(650px,1fr)_248px] items-stretch border-b border-slate-200 bg-white max-[1360px]:grid-cols-[270px_minmax(650px,1fr)_225px]">
      <div className="flex items-center gap-1.75 pl-2.5">
        <img
          src="/codee.png"
          alt=""
          className="block size-7.25 object-contain"
        />

        <img
          src="/codee-text.png"
          alt="codee"
          className="block h-auto w-19.25 object-contain"
        />
      </div>

      <nav
        className="flex items-stretch"
        aria-label="분석 결과 보기"
      >
        <button
          type="button"
          className={tabClasses('overview')}
          onClick={() =>
            onTabChange('overview')
          }
        >
          <Icon
            name="overview"
            size={15}
          />
          Overview
        </button>

        <button
          type="button"
          className={tabClasses('design')}
          onClick={() =>
            onTabChange('design')
          }
        >
          <Icon
            name="design"
            size={15}
          />
          Design
        </button>

        <button
          type="button"
          className={tabClasses('code')}
          onClick={() =>
            onTabChange('code')
          }
        >
          <Icon
            name="code"
            size={15}
          />
          Code
        </button>
      </nav>

      <Button
        variant="purple"
        className="mr-2.25 h-7.5 min-w-27 self-center justify-self-end rounded-[5px] px-4 text-[13px] shadow-[0_3px_8px_rgb(109_61_245/19%)]"
      >
        <Icon
          name="check"
          size={17}
        />
        Commit
      </Button>
    </header>
  );
}