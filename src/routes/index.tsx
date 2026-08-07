import { createBrowserRouter } from 'react-router-dom';
import MainPage from '@/pages/Main';
import RepositoryConnectPage from '@/pages/RepositoryConnect';
import AnalysisProgressPage from '@/pages/AnalysisProgress';
import OAuthCallbackPage from '@/pages/OAuthCallback';
<<<<<<< HEAD
=======
import RepositoryWorkspacePage from '@/pages/RepositoryWorkspace';
>>>>>>> 54d69ea (temp: AnalysisWorkspace 작업 보관)
import AnalysisWorkspacePage from '@/pages/AnalysisWorkspace';

export const router = createBrowserRouter([
  { path: '/', element: <MainPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  { path: '/repository-connect', element: <RepositoryConnectPage /> },
  { path: '/repository-analysis', element: <AnalysisProgressPage /> },
<<<<<<< HEAD
=======
  { path: '/repository-workspace', element: <RepositoryWorkspacePage /> },
>>>>>>> 54d69ea (temp: AnalysisWorkspace 작업 보관)
  { path: '/analysis-workspace', element: <AnalysisWorkspacePage /> },
]);
