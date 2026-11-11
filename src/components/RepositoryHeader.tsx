import { Link } from "react-router-dom";

interface RepositoryHeaderProps {
  showLogout: boolean;
  onLogout: () => void;
}

export default function RepositoryHeader({ showLogout, onLogout }: RepositoryHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-[63px] w-full max-w-7xl items-center px-6 md:px-10">
        <Link
          to="/"
          className="inline-flex h-[39px] w-[132px] shrink-0 items-center gap-0"
          aria-label="Codee 홈"
        >
          <img src="/codee.png" alt="" className="h-[39px] w-[43px] shrink-0 object-contain" />
          <img
            src="/codee-text.png"
            alt="Codee"
            className="h-[22px] w-[89px] shrink-0 object-contain"
          />
        </Link>
        {showLogout && (
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="h-9 cursor-pointer rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-point-200"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
