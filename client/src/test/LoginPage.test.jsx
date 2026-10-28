import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';
import { SESSION_KEY } from '../services/tokenStore';
import { renderApp } from './helpers';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn(), logout: vi.fn() },
}));

const future = () => new Date(Date.now() + 3600 * 1000).toISOString();
const USER = { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Priya S', email: 'priya@demo.com' };

beforeEach(() => {
  vi.mocked(authService.logout).mockResolvedValue({});
});

describe('Login page', () => {
  it('UT_04: submitting empty shows inline required errors and does not call the API', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it("UT_05: a malformed email shows 'Enter a valid email address'", async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'user@@demo');
    await user.type(screen.getByLabelText('Password'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('IT_04: valid credentials sign in, store the session and open the dashboard', async () => {
    vi.mocked(authService.login).mockResolvedValue({ token: 'tok.en.value', expiresAt: future(), user: USER });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'priya@demo.com');
    await user.type(screen.getByLabelText('Password'), 'Priya@2024');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Hi, Priya.' })).toBeInTheDocument();
    expect(authService.login).toHaveBeenCalledWith({ email: 'priya@demo.com', password: 'Priya@2024' });
    expect(JSON.parse(window.localStorage.getItem(SESSION_KEY)).token).toBe('tok.en.value');
  });

  it('IT_05: wrong credentials show the server message and keep the user on the page', async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiError('Invalid credentials', { status: 401 }));
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'priya@demo.com');
    await user.type(screen.getByLabelText('Password'), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('shows an offline message when the server cannot be reached', async () => {
    vi.mocked(authService.login).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'priya@demo.com');
    await user.type(screen.getByLabelText('Password'), 'Priya@2024');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });

  it('the password can be revealed and hidden', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('an unchecked "Keep me signed in" stores the session in sessionStorage only', async () => {
    vi.mocked(authService.login).mockResolvedValue({ token: 't.t.t', expiresAt: future(), user: USER });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'priya@demo.com');
    await user.type(screen.getByLabelText('Password'), 'Priya@2024');
    await user.click(screen.getByLabelText('Keep me signed in'));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('heading', { name: 'Hi, Priya.' });
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
  });
});

describe('Route guards and logout', () => {
  it('ST_05: visiting /dashboard without a session redirects to login', async () => {
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('ST_04: a stored session survives a refresh and is verified with the server', async () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
    vi.mocked(authService.me).mockResolvedValue({ user: USER });

    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Hi, Priya.' })).toBeInTheDocument();
    expect(authService.me).toHaveBeenCalled();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('ST_06: a stored token the server rejects sends the user to login with a notice', async () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
    vi.mocked(authService.me).mockRejectedValue(new ApiError('Token expired', { status: 401 }));

    renderApp('/dashboard');

    expect(await screen.findByText('Your session ended')).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('FR-13 / ST_36: Sign out clears the token and redirects to login', async () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
    vi.mocked(authService.me).mockResolvedValue({ user: USER });
    const user = userEvent.setup();

    renderApp('/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('signed-in users are bounced away from the login page', async () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
    vi.mocked(authService.me).mockResolvedValue({ user: USER });

    renderApp('/login');

    expect(await screen.findByRole('heading', { name: 'Hi, Priya.' })).toBeInTheDocument();
  });

  it('unknown URLs show the not found page', async () => {
    renderApp('/nope');
    expect(await screen.findByText('That page does not exist.')).toBeInTheDocument();
  });
});
