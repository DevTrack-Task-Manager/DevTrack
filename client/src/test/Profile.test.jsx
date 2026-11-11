import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { SESSION_KEY } from '../services/tokenStore';
import { renderApp } from './helpers';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn(), logout: vi.fn(), updateProfile: vi.fn() },
}));
vi.mock('../services/taskService', () => ({
  taskService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const future = () => new Date(Date.now() + 3600 * 1000).toISOString();
const USER = { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Priya S', email: 'priya@demo.com', createdAt: '2026-09-15T10:00:00.000Z' };
const SUMMARY = {
  total: 4,
  byStatus: { Pending: 1, 'In Progress': 1, Completed: 2 },
  byPriority: { Low: 1, Medium: 1, High: 2 },
};

async function openProfile() {
  renderApp('/profile');
  await screen.findByRole('heading', { name: 'Your profile' });
}

beforeEach(() => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
  vi.mocked(authService.me).mockResolvedValue({ user: USER });
  vi.mocked(authService.logout).mockResolvedValue({});
  vi.mocked(taskService.list).mockResolvedValue({ tasks: [], count: 0, summary: SUMMARY });
});

describe('Profile: user details', () => {
  it('requires a session: guests are sent to the login page', async () => {
    window.localStorage.clear();
    renderApp('/profile');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows name, email, member since and when the session ends', async () => {
    await openProfile();
    const details = screen.getByRole('region', { name: 'Account details' });
    expect(within(details).getByText('Priya S')).toBeInTheDocument();
    expect(within(details).getByText('priya@demo.com')).toBeInTheDocument();
    expect(within(details).getByText('Member since')).toBeInTheDocument();
    expect(within(details).getByText('Session ends')).toBeInTheDocument();
    expect(within(details).queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('shows task totals from the API summary', async () => {
    await openProfile();
    const activity = screen.getByRole('region', { name: 'Your activity' });
    await within(activity).findByText('High priority');
    const value = (label) => within(activity).getByText(label).parentElement.querySelector('dd').textContent;
    expect(value('Tasks')).toBe('4');
    expect(value('Open')).toBe('2');
    expect(value('Completed')).toBe('2');
    expect(value('High priority')).toBe('2');
    expect(within(activity).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('still works when the task totals cannot be loaded', async () => {
    vi.mocked(taskService.list).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    await openProfile();
    expect(await screen.findByText('Task totals are not available right now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
  });

  it('the Tasks link in the top bar goes back to the dashboard', async () => {
    const user = userEvent.setup();
    await openProfile();
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Tasks' }));
    expect(await screen.findByRole('heading', { name: 'Hi, Priya.' })).toBeInTheDocument();
  });
});

describe('Profile: editing details', () => {
  const startEditing = async (user) => {
    await openProfile();
    await user.click(screen.getByRole('button', { name: 'Edit details' }));
    return screen.getByRole('form', { name: 'Edit details' });
  };

  it('opens a form prefilled with the current details; Cancel closes it without saving', async () => {
    const user = userEvent.setup();
    const form = await startEditing(user);
    expect(within(form).getByLabelText('Name')).toHaveValue('Priya S');
    expect(within(form).getByLabelText('Email')).toHaveValue('priya@demo.com');
    expect(within(form).queryByLabelText('Current password')).not.toBeInTheDocument();

    await user.type(within(form).getByLabelText('Name'), ' Extra');
    await user.click(within(form).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('form', { name: 'Edit details' })).not.toBeInTheDocument();
    expect(authService.updateProfile).not.toHaveBeenCalled();
    expect(within(screen.getByRole('region', { name: 'Account details' })).getByText('Priya S')).toBeInTheDocument();
  });

  it('changing only the name saves without a password and updates the page and the top bar', async () => {
    vi.mocked(authService.updateProfile).mockResolvedValue({ message: 'Profile updated', user: { ...USER, name: 'Priya Sharma' } });
    const user = userEvent.setup();
    const form = await startEditing(user);

    await user.clear(within(form).getByLabelText('Name'));
    await user.type(within(form).getByLabelText('Name'), 'Priya Sharma');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
    expect(authService.updateProfile).toHaveBeenCalledWith({ name: 'Priya Sharma', email: 'priya@demo.com' });
    expect(screen.queryByRole('form', { name: 'Edit details' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Priya Sharma, your profile' })).toBeInTheDocument();
  });

  it('changing the email asks for the current password and sends it', async () => {
    vi.mocked(authService.updateProfile).mockResolvedValue({ message: 'Profile updated', user: { ...USER, email: 'new@demo.com' } });
    const user = userEvent.setup();
    const form = await startEditing(user);

    await user.clear(within(form).getByLabelText('Email'));
    await user.type(within(form).getByLabelText('Email'), 'new@demo.com');
    expect(within(form).getByLabelText('Current password')).toBeInTheDocument();

    await user.click(within(form).getByRole('button', { name: 'Save changes' }));
    expect(within(form).getByText('Password is required')).toBeInTheDocument();
    expect(authService.updateProfile).not.toHaveBeenCalled();

    await user.type(within(form).getByLabelText('Current password'), 'Test@123');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(authService.updateProfile).toHaveBeenCalledWith({ name: 'Priya S', email: 'new@demo.com', currentPassword: 'Test@123' })
    );
    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Account details' })).getByText('new@demo.com')).toBeInTheDocument();
  });

  it('validates inline and does not call the API: blank name, bad email', async () => {
    const user = userEvent.setup();
    const form = await startEditing(user);

    await user.clear(within(form).getByLabelText('Name'));
    await user.clear(within(form).getByLabelText('Email'));
    await user.type(within(form).getByLabelText('Email'), 'nope');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(within(form).getByText('Name is required')).toBeInTheDocument();
    expect(within(form).getByText('Enter a valid email address')).toBeInTheDocument();
    expect(within(form).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(within(form).getByLabelText('Name')).toHaveFocus();
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('shows a server field error (email already taken) next to the field and keeps the form open', async () => {
    vi.mocked(authService.updateProfile).mockRejectedValue(
      new ApiError('Email already registered', { status: 409, fields: { email: 'Email already registered' } })
    );
    const user = userEvent.setup();
    const form = await startEditing(user);
    await user.clear(within(form).getByLabelText('Email'));
    await user.type(within(form).getByLabelText('Email'), 'taken@demo.com');
    await user.type(within(form).getByLabelText('Current password'), 'Test@123');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await within(form).findByText('Email already registered')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Edit details' })).toBeInTheDocument();
    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument();
  });

  it('shows a wrong current password under that field', async () => {
    vi.mocked(authService.updateProfile).mockRejectedValue(
      new ApiError('Current password is incorrect', { status: 400, fields: { currentPassword: 'Current password is incorrect' } })
    );
    const user = userEvent.setup();
    const form = await startEditing(user);
    await user.clear(within(form).getByLabelText('Email'));
    await user.type(within(form).getByLabelText('Email'), 'new@demo.com');
    await user.type(within(form).getByLabelText('Current password'), 'wrong');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await within(form).findByText('Current password is incorrect')).toBeInTheDocument();
    expect(within(form).getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a network failure as a banner and keeps what was typed', async () => {
    vi.mocked(authService.updateProfile).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();
    const form = await startEditing(user);
    await user.clear(within(form).getByLabelText('Name'));
    await user.type(within(form).getByLabelText('Name'), 'Someone Else');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(within(form).getByLabelText('Name')).toHaveValue('Someone Else');
  });
});
