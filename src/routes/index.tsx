import { createBrowserRouter } from 'react-router-dom';
import MainPage from '@/pages/Main';
import RepositoryConnectPage from '@/pages/RepositoryConnect';
import AnalysisProgressPage from '@/pages/AnalysisProgress';

export const router = createBrowserRouter([
  { path: '/', element: <MainPage /> },
  { path: '/repository-connect', element: <RepositoryConnectPage /> },
  { path: '/repository-analysis', element: <AnalysisProgressPage /> },
]);
