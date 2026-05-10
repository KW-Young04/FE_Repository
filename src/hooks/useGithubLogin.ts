import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export function useGithubLogin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoginErrorOpen, setIsLoginErrorOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("login_error") === "true") {
      setIsLoginErrorOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const login = () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`;
  };

  const closeLoginError = () => setIsLoginErrorOpen(false);

  return { isLoginErrorOpen, login, closeLoginError };
}
