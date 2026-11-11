import { useSearchParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useGithubLogin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoginErrorOpen = searchParams.get("login_error") === "true";

  const login = () => {
    const redirectOrigin = encodeURIComponent(window.location.origin);
    window.location.href = `${API_BASE_URL}/oauth2/authorization/github?redirectOrigin=${redirectOrigin}`;
  };

  const closeLoginError = () =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("login_error");
        return next;
      },
      { replace: true },
    );

  return { isLoginErrorOpen, login, closeLoginError };
}
