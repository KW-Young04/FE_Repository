export default function CodeeLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="12" stroke="#E2E8F0" strokeWidth="2" />
        <path
          d="M18.5 9.5C16.8 7.4 14.1 6.2 11.2 6.5C8.3 6.8 6 8.5 4.8 11"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M9.5 18.5C11.2 20.6 13.9 21.8 16.8 21.5C19.7 21.2 22 19.5 23.2 17"
          stroke="#A855F7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M6.5 14H10.5" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-extrabold tracking-tight text-slate-900">codee</span>
    </div>
  );
}
