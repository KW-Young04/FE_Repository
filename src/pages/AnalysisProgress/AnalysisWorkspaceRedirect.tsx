import { Navigate, useSearchParams } from "react-router-dom";

export default function AnalysisWorkspaceRedirect() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return (
    <Navigate to={query ? `/repository-workspace?${query}` : "/repository-workspace"} replace />
  );
}

