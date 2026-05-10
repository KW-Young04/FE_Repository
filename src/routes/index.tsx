import { createBrowserRouter } from 'react-router-dom';
import MainPage from '@/pages/Main';
import RepositoryConnectPage from '@/pages/RepositoryConnect';
import AnalysisProgressPage from '@/pages/AnalysisProgress';
import OAuthCallbackPage from '@/pages/OAuthCallback';

export const router = createBrowserRouter([
  { path: '/', element: <MainPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  { path: '/repository-connect', element: <RepositoryConnectPage /> },
  { path: '/repository-analysis', element: <AnalysisProgressPage /> },
]);
