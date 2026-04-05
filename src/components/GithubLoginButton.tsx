type GithubLoginButtonProps = {
  className?: string;
};

export default function GithubLoginButton({
  className = "",
}: GithubLoginButtonProps) {
  const handleGithubLogin = () => {
    console.log("GitHub 로그인 버튼 클릭됨");
    alert("버튼 클릭됨");
    window.location.href = "http://localhost:8080/api/auth/login";
  };

  return (
    <button type="button" onClick={handleGithubLogin} className={className}>
      GitHub로 로그인
    </button>
  );
}
