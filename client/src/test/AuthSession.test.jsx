import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { SESSION_KEY } from '../services/tokenStore';
import { renderApp } from './helpers';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn(), logout: vi.fn() },
}));
vi.mock('../services/taskService', () => ({
  taskService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const inMs = (ms) => new Date(Date.now() + ms).toISOString();
const USER = { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Priya S', email: 'priya@demo.com' };
const store = (storage, expiresAt = inMs(3600 * 1000)) =>
  storage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt }));

beforeEach(() => {
  vi.mocked(authService.me).mockResolvedValue({ user: USER });
  vi.mocked(authService.logout).mockResolvedValue({});
  vi.mocked(taskService.list).mockResolvedValue({ tasks: [], count: 0 });
});

describe('ProtectedRoute (Issue #16)', () => {
  it('shows a loader while the stored session is verified, then the page, without redirecting', async () => {
    store(window.localStorage);
    let resolveMe;
    vi.mocked(authService.me).mockReturnValue(new Promise((resolve) => (resolveMe = resolve)));

    renderApp('/dashboard');

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hi, Priya.' })).not.toBeInTheDocument();

    await act(async () => resolveMe({ user: USER }));
    expect(await screen.findByRole('heading', { name: 'Hi, Priya.' })).toBeInTheDocument();
  });

  it('never calls the server or renders the page when there is no session', async () => {
    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(authService.me).not.toHaveBeenCalled();
    expect(taskService.list).not.toHaveBeenCalled();
  });

  it('an already expired stored session is discarded without asking the server', async () => {
    store(window.localStorage, inMs(-1000));

    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(authService.me).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('signed-in users are bounced away from the register page too', async () => {
    store(window.localStorage);

    renderApp('/register');

    expect(await screen.findByRole('heading', { name: 'Hi, Priya.' })).toBeInTheDocument();
  });
});

describe('Sign out (FR-13)', () => {
  it('removes a sessionStorage session as well (not "Keep me signed in")', async () => {
    store(window.sessionStorage);
    const user = userEvent.setup();

    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('still signs the user out when the server call fails', async () => {
    store(window.localStorage);
    vi.mocked(authService.logout).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();

    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('after signing out the dashboard stays locked and the user is not told the session "ended"', async () => {
    store(window.localStorage);
    const user = userEvent.setup();

    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    await screen.findByRole('heading', { name: 'Sign in' });
    expect(screen.queryByText('Your session ended')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hi, Priya.' })).not.toBeInTheDocument();
  });

  it('signing out in another tab signs this tab out', async () => {
    store(window.localStorage);

    renderApp('/dashboard');
    await screen.findByRole('heading', { name: 'Hi, Priya.' });

    act(() => {
      window.localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, newValue: null }));
    });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('Session expiry (ST_06)', () => {
  it('signs the user out when the token runs out, even with no clicks', async () => {
    store(window.localStorage, inMs(1200));

    renderApp('/dashboard');
    await screen.findByRole('heading', { name: 'Hi, Priya.' });

    expect(await screen.findByText('Your session ended', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('a 401 from the server on page load sends the user to login with a notice', async () => {
    store(window.localStorage);
    vi.mocked(authService.me).mockRejectedValue(new ApiError('Token expired', { status: 401 }));

    renderApp('/dashboard');

    expect(await screen.findByText('Your session ended')).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('a network failure on page load keeps the token so the user can retry', async () => {
    store(window.localStorage);
    vi.mocked(authService.me).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));

    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });
});
