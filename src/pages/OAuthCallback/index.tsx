import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setTimeout(() => navigate("/?login_error=true"), 2000);
      return;
    }

    localStorage.setItem("access_token", token);

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        id: String(payload.userId ?? payload.sub ?? ""),
        name: payload.loginId ?? "",
        email: payload.email ?? "",
      });
    } catch {
      // JWT 파싱 실패 시에도 토큰만 저장하고 진행
    }

    navigate("/repository-connect", { replace: true });
  }, [navigate, setUser]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">
            로그인에 실패했습니다. 메인 화면으로 이동합니다…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <svg className="h-10 w-10 animate-spin text-slate-900" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p className="text-lg font-semibold text-slate-700">GitHub 로그인 처리 중…</p>
      </div>
    </div>
  );
}
