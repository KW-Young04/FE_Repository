import { useState } from "react";

export default function LoginSuccessPage() {
  const [token] = useState<string | null>(() =>
    localStorage.getItem("accessToken")
  );

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/";
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>로그인 성공</h1>

      {token ? (
        <>
          <p>토큰이 정상적으로 저장되었습니다.</p>
          <p style={{ wordBreak: "break-all" }}>
            <strong>AccessToken:</strong> {token}
          </p>

          <button onClick={handleLogout} style={{ marginTop: "20px" }}>
            로그아웃
          </button>
        </>
      ) : (
        <p>토큰이 없습니다.</p>
      )}
    </div>
  );
}
