import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setUnauthorizedHandler } from '../services/api';
import { clearSession, loadSession, saveSession, SESSION_KEY } from '../services/tokenStore';

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const past = () => new Date(Date.now() - 1000).toISOString();

function mockFetch(status, body) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  setUnauthorizedHandler(null);
});

describe('tokenStore', () => {
  it('persists across reads and honours "keep me signed in"', () => {
    saveSession({ token: 't', expiresAt: future() }, { remember: true });
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
    expect(loadSession().token).toBe('t');
  });

  it('uses sessionStorage when not remembered', () => {
    saveSession({ token: 't', expiresAt: future() }, { remember: false });
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
    expect(loadSession().token).toBe('t');
  });

  it('ST_06: discards an expired session on read', () => {
    saveSession({ token: 't', expiresAt: past() });
    expect(loadSession()).toBeNull();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('ignores corrupted storage values', () => {
    window.localStorage.setItem(SESSION_KEY, '{not json');
    expect(loadSession()).toBeNull();
  });

  it('clearSession removes both stores', () => {
    saveSession({ token: 't', expiresAt: future() }, { remember: true });
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

describe('api client', () => {
  it('attaches the Bearer token to authenticated requests', async () => {
    saveSession({ token: 'abc.def.ghi', expiresAt: future() });
    const fetchMock = mockFetch(200, { ok: true });

    await api.get('/auth/me');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/me');
    expect(init.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('does not send the token when auth is false (login / register)', async () => {
    saveSession({ token: 'abc.def.ghi', expiresAt: future() });
    const fetchMock = mockFetch(200, {});

    await api.post('/auth/login', { email: 'a@b.co', password: 'x' }, { auth: false });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'x' });
  });

  it('throws ApiError carrying status, message and field errors', async () => {
    mockFetch(400, { error: 'Name is required', fields: { name: 'Name is required' } });

    await expect(api.post('/auth/register', {}, { auth: false })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Name is required',
      fields: { name: 'Name is required' },
    });
  });

  it('ST_06: a 401 on an authenticated request triggers the unauthorized handler', async () => {
    saveSession({ token: 'stale', expiresAt: future() });
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { error: 'Token expired' });

    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('a failed login (401 without a token) does NOT trigger the handler', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { error: 'Invalid credentials' });

    await expect(api.post('/auth/login', {}, { auth: false })).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.get('/auth/me')).rejects.toMatchObject({ status: 0 });
  });

  it('copes with empty and non-JSON bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => '<html>bad gateway</html>' }));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
  });
});
