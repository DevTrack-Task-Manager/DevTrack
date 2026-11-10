import { screen, waitFor, within } from '@testing-library/react';
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

const future = () => new Date(Date.now() + 3600 * 1000).toISOString();
const USER = { id: '65f1a2b3c4d5e6f7a8b9c0d1', name: 'Priya S', email: 'priya@demo.com' };

const task = (overrides = {}) => ({
  id: 't1',
  userId: USER.id,
  title: 'Write report',
  description: '',
  status: 'Pending',
  priority: 'Medium',
  dueDate: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

async function openDashboard(tasks) {
  vi.mocked(taskService.list).mockResolvedValue({ tasks, count: tasks.length });
  renderApp('/dashboard');
  await screen.findByRole('heading', { name: 'Hi, Priya.' });
  return tasks.length ? screen.findByRole('list', { name: 'Tasks' }) : null;
}

beforeEach(() => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
  vi.mocked(authService.me).mockResolvedValue({ user: USER });
  vi.mocked(authService.logout).mockResolvedValue({});
});

describe('Dashboard: priority display and quick change (FR-09)', () => {
  it('every card shows its priority as text and as the selected option', async () => {
    const list = await openDashboard([
      task({ id: 'a', title: 'A', priority: 'Low' }),
      task({ id: 'b', title: 'B', priority: 'Medium' }),
      task({ id: 'c', title: 'C', priority: 'High' }),
    ]);
    const [a, b, c] = within(list).getAllByRole('listitem');

    expect(within(a).getByText('Low priority')).toBeInTheDocument();
    expect(within(a).getByLabelText('Priority for A')).toHaveValue('Low');
    expect(within(b).getByText('Medium priority')).toBeInTheDocument();
    expect(within(b).getByLabelText('Priority for B')).toHaveValue('Medium');
    expect(within(c).getByText('High priority')).toBeInTheDocument();
    expect(within(c).getByLabelText('Priority for C')).toHaveValue('High');
  });

  it('offers exactly Low, Medium and High', async () => {
    const list = await openDashboard([task()]);
    const select = within(list).getByLabelText('Priority for Write report');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Low', 'Medium', 'High']);
  });

  it('sends only the priority, then updates the badge', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ message: 'Task updated', task: task({ priority: 'High' }) });
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.selectOptions(within(list).getByLabelText('Priority for Write report'), 'High');

    await waitFor(() => expect(within(list).getByText('High priority')).toBeInTheDocument());
    expect(taskService.update).toHaveBeenCalledWith('t1', { priority: 'High' });
    expect(within(list).queryByText('Medium priority')).not.toBeInTheDocument();
    expect(within(list).getByLabelText('Priority for Write report')).toHaveValue('High');
    expect(screen.getByRole('status')).toHaveTextContent('Write report now has High priority.');
  });

  it('keeps the old priority and shows an error when the save fails', async () => {
    vi.mocked(taskService.update).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.selectOptions(within(list).getByLabelText('Priority for Write report'), 'Low');

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(within(list).getByText('Medium priority')).toBeInTheDocument();
    expect(within(list).getByLabelText('Priority for Write report')).toHaveValue('Medium');
  });

  it('shows the server message for a rejected value (400)', async () => {
    vi.mocked(taskService.update).mockRejectedValue(new ApiError('Priority must be Low, Medium or High', { status: 400 }));
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.selectOptions(within(list).getByLabelText('Priority for Write report'), 'High');

    expect(await screen.findByRole('alert')).toHaveTextContent('Priority must be Low, Medium or High');
    expect(within(list).getByText('Medium priority')).toBeInTheDocument();
  });

  it('removes the card when the task no longer exists (404)', async () => {
    vi.mocked(taskService.update).mockRejectedValue(new ApiError('Task not found', { status: 404 }));
    const user = userEvent.setup();
    const list = await openDashboard([task(), task({ id: 't2', title: 'Other' })]);

    await user.selectOptions(within(list).getByLabelText('Priority for Write report'), 'High');

    expect(await screen.findByRole('alert')).toHaveTextContent('Task not found');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });
});

describe('Task form: priority selector (FR-09)', () => {
  it('defaults new tasks to Medium and sends the chosen priority', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ message: 'Task created', task: task({ id: 'n', priority: 'Low' }) });
    const user = userEvent.setup();
    await openDashboard([]);
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog', { name: 'New task' });
    expect(within(dialog).getByLabelText('Priority')).toHaveValue('Medium');

    await user.type(within(dialog).getByLabelText('Title'), 'Low stakes');
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'Low');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(taskService.create).toHaveBeenCalled());
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Low stakes', priority: 'Low' }));
  });

  it('editing prefills the current priority', async () => {
    const user = userEvent.setup();
    await openDashboard([task({ priority: 'High' })]);
    await user.click(await screen.findByRole('button', { name: 'Edit Write report' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('Priority')).toHaveValue('High');
  });
});
