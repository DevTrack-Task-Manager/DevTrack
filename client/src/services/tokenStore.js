/**
 * Persists the session (JWT + expiry) in the browser.
 *  - "Keep me signed in" ticked  -> localStorage (survives closing the browser)
 *  - unticked                    -> sessionStorage (cleared when the tab closes)
 * Reads check both. Expired sessions are discarded on read (Test Plan ST_06).
 *
 * Note: any script running on the page can read browser storage, so the app must never
 * render untrusted HTML (React escapes by default; do not use dangerouslySetInnerHTML).
 */
export const SESSION_KEY = 'devtrack.session';

function read(storage) {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session && typeof session.token === 'string' && session.expiresAt ? session : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable (private mode / blocked): nothing to clear */
    }
  }
}

export function saveSession({ token, expiresAt }, { remember = true } = {}) {
  clearSession();
  const storage = remember ? window.localStorage : window.sessionStorage;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt }));
  } catch {
    /* storage full or blocked: session lives for this page load only */
  }
}

/** @returns {{ token: string, expiresAt: string } | null} */
export function loadSession() {
  const session = read(window.localStorage) ?? read(window.sessionStorage);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    clearSession();
    return null;
  }
  return session;
}

export function getToken() {
  return loadSession()?.token ?? null;
}
