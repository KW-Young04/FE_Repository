import { createBrowserRouter, Navigate, useSearchParams } from "react-router-dom";

import MainPage from "@/pages/Main";
import RepositoryConnectPage from "@/pages/RepositoryConnect";
import AnalysisProgressPage from "@/pages/AnalysisProgress";
import OAuthCallbackPage from "@/pages/OAuthCallback";
import RepositoryWorkspacePage from "@/pages/RepositoryWorkspace";
import RepositoryWorkspaceTestPage from "@/pages/RepositoryWorkspaceTest";

function AnalysisWorkspaceRedirect() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return (
    <Navigate to={query ? `/repository-workspace?${query}` : "/repository-workspace"} replace />
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <MainPage /> },
  { path: "/auth/callback", element: <OAuthCallbackPage /> },
  { path: "/oauth/callback", element: <OAuthCallbackPage /> },
  { path: "/repository-connect", element: <RepositoryConnectPage /> },
  { path: "/repository-analysis", element: <AnalysisProgressPage /> },
  { path: "/analysis-workspace", element: <AnalysisWorkspaceRedirect /> },
  { path: "/repository-workspace", element: <RepositoryWorkspacePage /> },
  { path: "/repository-workspace-test", element: <RepositoryWorkspaceTestPage /> },
]);
