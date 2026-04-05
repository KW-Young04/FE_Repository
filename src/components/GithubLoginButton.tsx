type GithubLoginButtonProps = {
  className?: string;
};

export default function GithubLoginButton({
  className = "",
}: GithubLoginButtonProps) {
  const handleGithubLogin = () => {
    window.location.href = "http://localhost:8080/api/auth/login";
  };

  return (
    <button type="button" onClick={handleGithubLogin} className={className}>
      GitHub로 로그인
    </button>
  );
}
