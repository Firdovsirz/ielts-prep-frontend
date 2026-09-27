import { RouterProvider } from 'react-router-dom';
import { useAuth } from './auth';
import { LoginPage } from './LoginPage';
import { router } from './router';

export function Root() {
  const { token } = useAuth();
  return token ? <RouterProvider router={router} /> : <LoginPage />;
}
