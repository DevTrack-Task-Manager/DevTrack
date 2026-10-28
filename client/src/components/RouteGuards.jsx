import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageLoader from './PageLoader';

/** Protected pages: unauthenticated visitors go to /login and return afterwards (Test Plan ST_05). */
export function ProtectedRoute() {
  const { status, notice } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader label="Checking your session" />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location, reason: notice }} />;
  }
  return <Outlet />;
}

/** Login and register: signed-in users are sent on to the app instead. */
export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader label="Checking your session" />;
  if (status === 'authenticated') {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }
  return <Outlet />;
}
