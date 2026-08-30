import { createBrowserRouter } from "react-router-dom";

import MainPage from "@/pages/Main";
import RepositoryConnectPage from "@/pages/RepositoryConnect";
import AnalysisProgressPage from "@/pages/AnalysisProgress";
import OAuthCallbackPage from "@/pages/OAuthCallback";
import RepositoryWorkspacePage from "@/pages/RepositoryWorkspace";
import RepositoryWorkspaceTestPage from "@/pages/RepositoryWorkspaceTest";

export const router = createBrowserRouter([
  { path: "/", element: <MainPage /> },
  { path: "/auth/callback", element: <OAuthCallbackPage /> },
  { path: "/oauth/callback", element: <OAuthCallbackPage /> },
  { path: "/repository-connect", element: <RepositoryConnectPage /> },
  { path: "/repository-analysis", element: <AnalysisProgressPage /> },
  { path: "/repository-workspace", element: <RepositoryWorkspacePage /> },
  { path: "/repository-workspace-test", element: <RepositoryWorkspaceTestPage /> },
]);
