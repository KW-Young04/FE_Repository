import githubImage from "@/assets/github.png";
import Button from "@/components/Button";
import LoginErrorModal from "./LoginErrorModal";
import { useGithubLogin } from "@/hooks/useGithubLogin";

const features = [
  {
    title: "화면과 코드를 함께",
    description: "실제 화면과 코드를 연결해 문제의 원인을 찾아요.",
  },
  {
    title: "바로 적용하는 개선안",
    description: "수정할 부분과 적용 가능한 코드 제안을 확인해요.",
  },
  {
    title: "더 나은 사용자 경험",
    description: "접근성과 UI/UX를 함께 살펴 완성도를 높여요.",
  },
];

function Main() {
  const { isLoginErrorOpen, login, closeLoginError } = useGithubLogin();

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-56 h-[32rem] bg-[radial-gradient(ellipse_at_50%_70%,rgba(191,219,254,0.44),rgba(255,255,255,0)_68%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-6 py-3 md:px-10">
        <a href="/" className="inline-flex items-center gap-0" aria-label="Codee 홈">
          <img src="/codee.png" alt="" className="h-[39px] w-[43px] object-contain" />
          <img src="/codee-text.png" alt="Codee" className="h-[22px] w-[89px] object-contain" />
        </a>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-12 text-center sm:pt-16 md:px-10 md:pt-20">
        <p className="text-[15px] font-semibold tracking-wide text-blue-700/70 sm:text-[17px]">
          GitHub 기반 UI/UX 분석 및 코드 개선
        </p>
        <h1 className="mt-4 text-[38px] font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-[50px] md:text-[62px]">
          코드와 디자인을 잇는 코디,
          <br />
          더 나은 경험을 쉽게.
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-7 text-slate-500 sm:text-[17px]">
          실제 화면에서 찾은 개선점부터 코드 제안까지.
          <br className="hidden sm:block" />
          Codee와 함께 사용자를 위한 웹을 만들어보세요.
        </p>
        <div className="mt-8 w-full max-w-sm">
          <Button
            onClick={login}
            variant="default"
            className="h-14 w-full gap-2 rounded-lg px-8 text-[17px]"
          >
            <img src={githubImage} alt="" className="h-[22px] w-[22px] object-contain brightness-0 invert" />
            <span>GitHub로 시작하기</span>
          </Button>
        </div>
      </section>

      <section
        aria-label="Codee 분석 화면 미리보기"
        className="relative mx-auto mt-10 h-[19rem] w-full max-w-6xl px-6 sm:mt-12 md:h-[22rem] md:px-10"
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-200/30 blur-3xl md:h-72 md:w-72"
        />
        <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl border border-white/80 bg-white/80 shadow-xl shadow-blue-900/10 backdrop-blur md:h-28 md:w-28">
          <span className="font-mono text-3xl font-semibold tracking-tight text-blue-500 md:text-4xl">
            &lt;/&gt;
          </span>
        </div>
        <div className="absolute left-1/2 top-[16%] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-blue-300 shadow-[0_0_20px_rgba(96,165,250,0.7)]" />
        <div className="absolute left-[5%] top-[23%] hidden w-[34%] -rotate-[9deg] rounded-2xl border border-white/80 bg-white/75 p-4 shadow-xl shadow-slate-300/25 backdrop-blur sm:block md:p-5">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
            <span className="ml-auto font-mono text-[9px] text-slate-300">App.tsx</span>
          </div>
          <div className="space-y-2.5">
            <div className="h-2 w-2/5 rounded-full bg-blue-300/80" />
            <div className="h-2 w-4/5 rounded-full bg-slate-200" />
            <div className="h-2 w-3/5 rounded-full bg-slate-200" />
            <div className="h-2 w-2/3 rounded-full bg-blue-200" />
            <div className="h-2 w-4/5 rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="absolute right-[5%] top-[25%] hidden w-[34%] rotate-[8deg] rounded-2xl border border-white/80 bg-white/75 p-4 shadow-xl shadow-slate-300/25 backdrop-blur sm:block md:p-5">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
            <span className="ml-auto font-mono text-[9px] text-slate-300">Preview</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-16 w-1/4 rounded-lg bg-blue-50" />
            <div className="flex-1 space-y-2.5 pt-1">
              <div className="h-2 w-3/4 rounded-full bg-blue-300/80" />
              <div className="h-2 w-full rounded-full bg-slate-200" />
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <div className="h-8 rounded-md bg-blue-100/80" />
                <div className="h-8 rounded-md bg-blue-50" />
                <div className="h-8 rounded-md bg-blue-100/60" />
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[16%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-lg shadow-slate-300/25 backdrop-blur">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-500">
            ✓
          </span>
          <span className="text-[13px] font-medium text-slate-500">접근성 개선 제안</span>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-3 md:px-10 md:pb-20">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-100 bg-white/80 p-5 text-left shadow-sm shadow-slate-200/40"
          >
            <h2 className="text-[15px] font-bold text-slate-800">{feature.title}</h2>
            <p className="mt-2 text-[15px] leading-6 text-slate-500">{feature.description}</p>
          </article>
        ))}
      </section>

      <LoginErrorModal isOpen={isLoginErrorOpen} onClose={closeLoginError} />
    </main>
  );
}

export default Main;
