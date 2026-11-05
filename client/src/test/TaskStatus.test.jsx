import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRIORITIES, STATUS_ACTIONS, STATUSES } from '../constants/tasks';
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

describe('Status workflow constants (Issue #5)', () => {
  it('offers moves only to valid statuses, never to the current one', () => {
    expect(Object.keys(STATUS_ACTIONS).sort()).toEqual([...STATUSES].sort());
    for (const [from, actions] of Object.entries(STATUS_ACTIONS)) {
      expect(actions.length).toBeGreaterThan(0);
      for (const { next } of actions) {
        expect(STATUSES).toContain(next);
        expect(next).not.toBe(from);
      }
    }
  });

  it('the enums match the API contract', () => {
    expect([...STATUSES]).toEqual(['Pending', 'In Progress', 'Completed']);
    expect([...PRIORITIES]).toEqual(['Low', 'Medium', 'High']);
  });
});

describe('Dashboard: quick status changes (FR-08)', () => {
  it('shows the right moves for each status', async () => {
    const list = await openDashboard([
      task({ id: 'a', title: 'A', status: 'Pending' }),
      task({ id: 'b', title: 'B', status: 'In Progress' }),
      task({ id: 'c', title: 'C', status: 'Completed' }),
    ]);
    const [a, b, c] = within(list).getAllByRole('listitem');

    expect(within(a).getByRole('button', { name: 'Mark A as In Progress' })).toHaveTextContent('Start');
    expect(within(a).getByRole('button', { name: 'Mark A as Completed' })).toHaveTextContent('Complete');
    expect(within(b).getByRole('button', { name: 'Mark B as Completed' })).toBeInTheDocument();
    expect(within(b).getByRole('button', { name: 'Mark B as Pending' })).toHaveTextContent('Back to Pending');
    expect(within(c).getByRole('button', { name: 'Mark C as In Progress' })).toHaveTextContent('Reopen');
    expect(within(c).queryByRole('button', { name: /Mark C as Completed/ })).not.toBeInTheDocument();
  });

  it('sends only the status, then updates the badge and the summary counters', async () => {
    const saved = task({ status: 'In Progress' });
    vi.mocked(taskService.update).mockResolvedValue({ message: 'Task updated', task: saved });
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.click(within(list).getByRole('button', { name: 'Mark Write report as In Progress' }));

    await waitFor(() => expect(within(list).getByText('In Progress')).toBeInTheDocument());
    expect(taskService.update).toHaveBeenCalledWith('t1', { status: 'In Progress' });
    expect(within(list).queryByText('Pending')).not.toBeInTheDocument();

    const summary = screen.getByRole('region', { name: 'Task summary' });
    const value = (label) => within(summary).getByText(label).parentElement.querySelector('dd');
    expect(value('Pending')).toHaveTextContent('0');
    expect(value('In Progress')).toHaveTextContent('1');
    expect(screen.getByRole('status')).toHaveTextContent('Write report is now In Progress.');
  });

  it('completing a task marks the card as done and drops it from the open count', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ message: 'Task updated', task: task({ status: 'Completed' }) });
    const user = userEvent.setup();
    const list = await openDashboard([task()]);
    expect(screen.getByText('1 open task.')).toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: 'Mark Write report as Completed' }));

    await waitFor(() => expect(screen.getByText('Nothing open right now.')).toBeInTheDocument());
    expect(within(list).getAllByRole('listitem')[0]).toHaveClass('task--done');
    expect(within(list).getByText('Completed')).toBeInTheDocument();
  });

  it('disables the status buttons while saving, so a double click sends one request', async () => {
    let resolve;
    vi.mocked(taskService.update).mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.click(within(list).getByRole('button', { name: 'Mark Write report as In Progress' }));

    expect(within(list).getByRole('button', { name: 'Mark Write report as In Progress' })).toBeDisabled();
    expect(within(list).getByRole('button', { name: 'Mark Write report as Completed' })).toBeDisabled();
    await user.click(within(list).getByRole('button', { name: 'Mark Write report as Completed' }));
    expect(taskService.update).toHaveBeenCalledTimes(1);

    resolve({ message: 'Task updated', task: task({ status: 'In Progress' }) });
    await waitFor(() => expect(within(list).getByText('In Progress')).toBeInTheDocument());
  });

  it('keeps the old status and shows an error when the save fails', async () => {
    vi.mocked(taskService.update).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.click(within(list).getByRole('button', { name: 'Mark Write report as Completed' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(within(list).getByText('Pending')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Mark Write report as Completed' })).toBeEnabled();
  });

  it('shows the server message for a rejected value (400) and changes nothing', async () => {
    vi.mocked(taskService.update).mockRejectedValue(
      new ApiError('Status must be Pending, In Progress or Completed', { status: 400 })
    );
    const user = userEvent.setup();
    const list = await openDashboard([task()]);

    await user.click(within(list).getByRole('button', { name: 'Mark Write report as In Progress' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Status must be Pending, In Progress or Completed');
    expect(within(list).getByText('Pending')).toBeInTheDocument();
  });

  it('removes the card when the task no longer exists (404)', async () => {
    vi.mocked(taskService.update).mockRejectedValue(new ApiError('Task not found', { status: 404 }));
    const user = userEvent.setup();
    const list = await openDashboard([task(), task({ id: 't2', title: 'Other' })]);

    await user.click(within(list).getByRole('button', { name: 'Mark Write report as Completed' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Task not found');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });
});

describe('Task form: status and priority selectors (FR-08, FR-09)', () => {
  it('new tasks default to Pending and Medium and list every supported value', async () => {
    const user = userEvent.setup();
    await openDashboard([]);
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog', { name: 'New task' });
    const status = within(dialog).getByLabelText('Status');
    const priority = within(dialog).getByLabelText('Priority');

    expect(status).toHaveValue('Pending');
    expect(priority).toHaveValue('Medium');
    expect(within(status).getAllByRole('option').map((o) => o.textContent)).toEqual(['Pending', 'In Progress', 'Completed']);
    expect(within(priority).getAllByRole('option').map((o) => o.textContent)).toEqual(['Low', 'Medium', 'High']);
  });

  it('sends the chosen status in the payload', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ message: 'Task created', task: task({ id: 'n', status: 'Completed' }) });
    const user = userEvent.setup();
    await openDashboard([]);
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Already done');
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'Completed');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(taskService.create).toHaveBeenCalled());
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Already done', status: 'Completed' }));
  });
});
