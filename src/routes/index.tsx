import { createBrowserRouter } from 'react-router-dom';
import MainPage from '@/pages/Main';
import MainRepositoryConnect from '@/pages/Main/RepositoryConnect';

export const router = createBrowserRouter([
  { path: '/', element: <MainPage /> },
  { path: '/repository-connect', element: <MainRepositoryConnect /> },
]);
