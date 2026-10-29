/**
 * Route guards (Issue #16, FR-03, FR-13).
 *
 * ProtectedRoute wraps every page that needs a signed-in user (see App.jsx). Guests are sent to
 * /login with `replace`, so the protected page is not left in the back-button history, and the
 * page they asked for is passed along in router state so login can return them to it (ST_05).
 * While a stored session is still being verified with the server the guard renders a loader and
 * neither shows the page nor redirects, so a refresh never flashes protected content or bounces
 * a valid user to /login.
 *
 * GuestRoute does the reverse for /login and /register: signed-in users go on to the app.
 *
 * Security note: these guards only control what the BROWSER shows. They are a convenience, not
 * a security boundary. Real protection is server side: every /api/tasks route verifies the JWT
 * and scopes data to the token's user (Issues #3 and #4). Never put secrets in client code.
 */
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
