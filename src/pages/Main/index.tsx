import signupImage from "@/assets/signup.png";
import githubImage from "@/assets/github.png";
import Button from "@/components/Button";
import LoginErrorModal from "./LoginErrorModal";
import { useGithubLogin } from "@/hooks/useGithubLogin";
import { useNavigate } from "react-router-dom";

const features = [
  "코드와 실제 화면을 함께 분석",
  "바로 적용 가능한 코드 제안",
  "WCAG 기준 접근성 점검",
  "GitHub 저장소 연동",
];

function Main() {
  const navigate = useNavigate();
  const { isLoginErrorOpen, login, closeLoginError } = useGithubLogin();

  const handleRepositoryImageClick = () => {
    if (localStorage.getItem("access_token")) {
      navigate("/repository-connect");
      return;
    }

    login();
  };

  return (
    <main className="flex min-h-screen items-center bg-white px-6 md:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 py-10 md:py-14 lg:flex-row lg:justify-between">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl">
            GitHub 기반
            <br />
            UI/UX 분석 &amp; 코드 개선
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700">
            저장소를 연결하면 실제 화면과 코드를 함께 분석해
            <br />
            접근성 문제를 찾아드립니다.
          </p>

          <ul className="mt-8 grid grid-cols-1 gap-y-3 text-base font-medium text-slate-800 sm:grid-cols-2 sm:gap-x-8">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  ?
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={login}
            variant="default"
            className="mt-10 inline-flex h-14 w-full max-w-lg items-center justify-center gap-3 px-8 text-2xl"
          >
            <img src={githubImage} alt="GitHub 아이콘" className="h-8 w-8 object-contain" />
            <span>GitHub로 로그인</span>
          </Button>
        </div>

        <button
          type="button"
          onClick={handleRepositoryImageClick}
          className="w-full max-w-2xl cursor-pointer border-0 bg-transparent p-0 text-left"
          aria-label="저장소 연결 시작"
        >
          <img
            src={signupImage}
            alt="저장소 연결 화면"
            className="h-auto w-full object-contain"
          />
        </button>
      </section>

      <LoginErrorModal isOpen={isLoginErrorOpen} onClose={closeLoginError} />
    </main>
  );
}

export default Main;
