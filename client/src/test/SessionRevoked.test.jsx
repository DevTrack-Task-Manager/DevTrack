import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY } from '../services/tokenStore';
import { renderApp } from './helpers';

// This file uses the REAL services and stubs only `fetch`, so it proves the whole chain:
// api.js sees a 401 on a task request -> AuthContext ends the session -> the guard redirects.

const USER = { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Priya S', email: 'priya@demo.com' };
const reply = (status, body) => ({ ok: status < 300, status, text: async () => JSON.stringify(body) });

afterEach(() => vi.unstubAllGlobals());

describe('a token that stops working mid-session (Issue #16, ST_06)', () => {
  it('a 401 on a task request signs the user out and explains why', async () => {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: 'a.b.c', expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() })
    );
    const fetchMock = vi.fn((url) =>
      Promise.resolve(String(url).endsWith('/auth/me') ? reply(200, { user: USER }) : reply(401, { error: 'Token expired' }))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/dashboard');

    expect(await screen.findByText('Your session ended')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();

    const taskCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/tasks'));
    expect(taskCall[1].headers.Authorization).toBe('Bearer a.b.c');
  });
});
