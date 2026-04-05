import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("accessToken", token);
      navigate("/login-success", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }, [searchParams, navigate]);

  return <div>로그인 처리 중...</div>;
}
