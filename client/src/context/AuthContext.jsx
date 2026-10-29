/**
 * Auth state and token lifecycle (Issues #2, #3 and #16; FR-02, FR-03, FR-13).
 *
 * TOKEN HANDLING
 *  - The 24 hour HS256 JWT comes back from POST /api/auth/login and is kept ONLY in browser
 *    storage through services/tokenStore.js: localStorage when "Keep me signed in" is ticked,
 *    otherwise sessionStorage (cleared when the tab closes). It is never put in the URL, in React
 *    state, in the DOM, or in logs. This context holds only the user profile and the expiry time.
 *  - services/api.js reads the token at request time and sends it as `Authorization: Bearer`.
 *
 * WHAT ENDS A SESSION (all go through endSession(), which clears storage and resets state)
 *  1. The user clicks Sign out (logout below).
 *  2. The token's expiry time passes: a timer signs the user out even if they do nothing.
 *  3. Any authenticated request answers 401 (expired, tampered or revoked account): api.js calls
 *     the handler registered here.
 *  4. Another tab signs out: the `storage` event removes the session here too.
 *  5. On page load, a stored session the server rejects is discarded.
 *
 * LOGOUT IS CLIENT SIDE BY DESIGN
 *  JWTs are stateless, so the server cannot revoke one before it expires. POST /api/auth/logout
 *  only acknowledges the request, and the real sign out is the client discarding the token
 *  (see DEVIATIONS.md #10). The call is best effort: signing out never waits for it or fails
 *  because of it.
 *
 * XSS RISK
 *  Anything running on the page can read browser storage. The app therefore never renders
 *  untrusted HTML (no dangerouslySetInnerHTML), and the backend strips markup from task text.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './authContextValue';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';
import { SESSION_KEY, clearSession, loadSession, saveSession } from '../services/tokenStore';

/**
 * status:  'loading' (checking a stored session) | 'authenticated' | 'unauthenticated'
 * notice:  why the user was signed out: 'expired' | 'offline' | null (shown on the login page)
 */
const SIGNED_OUT = { status: 'unauthenticated', user: null, session: null, notice: null };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, session: null, notice: null });
  const expiryTimer = useRef(null);

  const stopExpiryTimer = useCallback(() => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
  }, []);

  const endSession = useCallback(
    (notice = null) => {
      stopExpiryTimer();
      clearSession();
      setState({ ...SIGNED_OUT, notice });
    },
    [stopExpiryTimer]
  );

  // Sign the user out the moment the 24 h token runs out, even if they never click anything.
  const watchExpiry = useCallback(
    (expiresAt) => {
      stopExpiryTimer();
      const remaining = Date.parse(expiresAt) - Date.now();
      if (remaining <= 0) {
        endSession('expired');
        return;
      }
      expiryTimer.current = setTimeout(() => endSession('expired'), Math.min(remaining, 2 ** 31 - 1));
    },
    [endSession, stopExpiryTimer]
  );

  // Restore the session after a page refresh (Test Plan ST_04) and verify it with the server.
  useEffect(() => {
    let cancelled = false;
    const stored = loadSession();
    if (!stored) {
      setState({ ...SIGNED_OUT });
      return undefined;
    }
    authService
      .me()
      .then(({ user }) => {
        if (cancelled) return;
        setState({ status: 'authenticated', user, session: { expiresAt: stored.expiresAt }, notice: null });
        watchExpiry(stored.expiresAt);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) endSession('expired');
        else setState({ ...SIGNED_OUT, notice: 'offline' }); // keep the token: the server was just unreachable
      });
    return () => {
      cancelled = true;
    };
  }, [endSession, watchExpiry]);

  // Any 401 on an authenticated request means the token is no longer good (Test Plan ST_06).
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('expired'));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Signing out in one tab signs out the others.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === SESSION_KEY && !event.newValue) endSession(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [endSession]);

  useEffect(() => stopExpiryTimer, [stopExpiryTimer]);

  const login = useCallback(
    async ({ email, password, remember = true }) => {
      const data = await authService.login({ email, password });
      saveSession({ token: data.token, expiresAt: data.expiresAt }, { remember });
      setState({ status: 'authenticated', user: data.user, session: { expiresAt: data.expiresAt }, notice: null });
      watchExpiry(data.expiresAt);
      return data.user;
    },
    [watchExpiry]
  );

  const register = useCallback((details) => authService.register(details), []);

  // FR-13: clear client state immediately. The server call is best effort and never awaited,
  // because JWTs are stateless: the server cannot revoke the token, only the client can discard it.
  const logout = useCallback(() => {
    authService.logout().catch(() => {}); // starts the request (token read synchronously) before we clear it
    endSession(null);
  }, [endSession]);

  const clearNotice = useCallback(() => setState((prev) => ({ ...prev, notice: null })), []);

  const value = useMemo(
    () => ({ ...state, isAuthenticated: state.status === 'authenticated', login, register, logout, clearNotice }),
    [state, login, register, logout, clearNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
