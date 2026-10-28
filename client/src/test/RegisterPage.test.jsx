import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authService } from '../services/authService';
import { ApiError } from '../services/api';
import { renderApp } from './helpers';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn(), logout: vi.fn() },
}));

async function fillAndSubmit(user, { name = 'Priya S', email = 'priya@demo.com', password = 'Priya@2024' } = {}) {
  if (name) await user.type(await screen.findByLabelText('Name'), name);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('Register page', () => {
  it('UT_01: empty submit lists every missing field and calls nothing', async () => {
    const user = userEvent.setup();
    renderApp('/register');

    await user.click(await screen.findByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it("UT_03: a weak password shows 'Password too weak (minimum 6 characters)'", async () => {
    const user = userEvent.setup();
    renderApp('/register');
    await fillAndSubmit(user, { password: '123' });

    expect(screen.getByText('Password too weak (minimum 6 characters)')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('shows a strength label that is text, not colour only', async () => {
    const user = userEvent.setup();
    renderApp('/register');
    await user.type(await screen.findByLabelText('Password'), 'Abcdefg1!xyz');
    expect(screen.getByRole('status')).toHaveTextContent('Strong');
  });

  it('ST_01: success redirects to login with a confirmation and the email prefilled', async () => {
    vi.mocked(authService.register).mockResolvedValue({ message: 'Registration successful' });
    const user = userEvent.setup();
    renderApp('/register');
    await fillAndSubmit(user);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Account created')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('priya@demo.com');
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Priya S',
      email: 'priya@demo.com',
      password: 'Priya@2024',
    });
  });

  it("IT_02: a duplicate email from the server appears inline on the email field", async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new ApiError('Email already registered', { status: 409, fields: { email: 'Email already registered' } })
    );
    const user = userEvent.setup();
    renderApp('/register');
    await fillAndSubmit(user);

    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('shows a form-level alert for failures that are not tied to a field', async () => {
    vi.mocked(authService.register).mockRejectedValue(new ApiError('boom', { status: 500 }));
    const user = userEvent.setup();
    renderApp('/register');
    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side');
  });
});
