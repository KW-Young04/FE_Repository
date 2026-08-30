const ACCESS_TOKEN_KEY = "access_token";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function parseUserFromToken(token: string): AuthUser | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;

    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;

    return {
      id: String(payload.userId ?? payload.sub ?? ""),
      name: typeof payload.loginId === "string" ? payload.loginId : "",
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

/**
 * 백엔드는 로그인 성공 시 콜백 경로가 아니라 요청 origin의 서비스 페이지로 `?token=`을 붙여 리다이렉트한다.
 * 따라서 진입 지점이 어디든 토큰을 회수할 수 있어야 한다.
 */
export function consumeAccessTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return null;

  saveAccessToken(token);

  params.delete("token");
  const query = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
  );

  return token;
}
