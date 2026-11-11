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

const ALL = [
  task({ id: 'a', title: 'Alpha', status: 'Pending', priority: 'High' }),
  task({ id: 'b', title: 'Bravo', status: 'In Progress', priority: 'High' }),
  task({ id: 'c', title: 'Charlie', status: 'Completed', priority: 'Low' }),
];

/** Fake server: applies the same AND filter as GET /api/tasks. */
function fakeList(source = ALL) {
  vi.mocked(taskService.list).mockImplementation(async ({ status, priority } = {}) => {
    const tasks = source.filter((t) => (!status || t.status === status) && (!priority || t.priority === priority));
    return { tasks, count: tasks.length };
  });
}

const filterBar = () => screen.getByRole('group', { name: 'Filter tasks' });
const lastCall = () => vi.mocked(taskService.list).mock.calls.at(-1)[0];

async function openDashboard() {
  renderApp('/dashboard');
  await screen.findByRole('heading', { name: 'Hi, Priya.' });
  await screen.findByRole('list', { name: 'Tasks' });
}

beforeEach(() => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
  vi.mocked(authService.me).mockResolvedValue({ user: USER });
  vi.mocked(authService.logout).mockResolvedValue({});
  fakeList();
});

describe('Dashboard filters (Issue #7, FR-10)', () => {
  it('shows status and priority dropdowns, starting on "All", and loads everything once', async () => {
    await openDashboard();
    const bar = within(filterBar());

    expect(bar.getByLabelText('Status')).toHaveValue('');
    expect(bar.getByLabelText('Priority')).toHaveValue('');
    expect(within(bar.getByLabelText('Status')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All statuses',
      'Pending',
      'In Progress',
      'Completed',
    ]);
    expect(within(bar.getByLabelText('Priority')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All priorities',
      'Low',
      'Medium',
      'High',
    ]);
    expect(taskService.list).toHaveBeenCalledTimes(1);
    expect(lastCall()).toMatchObject({ status: '', priority: '' });
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('filtering by status asks the server and shows only that subset', async () => {
    const user = userEvent.setup();
    await openDashboard();

    await user.selectOptions(within(filterBar()).getByLabelText('Status'), 'In Progress');

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(lastCall()).toMatchObject({ status: 'In Progress', priority: '' });
    expect(within(screen.getByRole('list', { name: 'Tasks' })).getByText('Bravo')).toBeInTheDocument();
  });

  it('filtering by priority asks the server and shows only that subset', async () => {
    const user = userEvent.setup();
    await openDashboard();

    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(lastCall()).toMatchObject({ status: '', priority: 'High' });
  });

  it('both filters work together', async () => {
    const user = userEvent.setup();
    await openDashboard();

    await user.selectOptions(within(filterBar()).getByLabelText('Status'), 'Pending');
    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');

    await waitFor(() => expect(lastCall()).toMatchObject({ status: 'Pending', priority: 'High' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('"Clear filters" is disabled until a filter is set, then resets both and reloads everything', async () => {
    const user = userEvent.setup();
    await openDashboard();
    const clear = within(filterBar()).getByRole('button', { name: 'Clear filters' });
    expect(clear).toBeDisabled();

    await user.selectOptions(within(filterBar()).getByLabelText('Status'), 'Completed');
    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'Low');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(clear).toBeEnabled();

    await user.click(clear);

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));
    expect(within(filterBar()).getByLabelText('Status')).toHaveValue('');
    expect(within(filterBar()).getByLabelText('Priority')).toHaveValue('');
    expect(lastCall()).toMatchObject({ status: '', priority: '' });
    expect(clear).toBeDisabled();
  });

  it('shows "No matching tasks" with a way out when filters hide everything', async () => {
    const user = userEvent.setup();
    await openDashboard();

    await user.selectOptions(within(filterBar()).getByLabelText('Status'), 'Completed');
    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');

    expect(await screen.findByText('No matching tasks')).toBeInTheDocument();
    expect(screen.queryByText('No tasks found')).not.toBeInTheDocument();
    // the filter bar stays visible so the user is never stuck
    expect(within(filterBar()).getByLabelText('Status')).toHaveValue('Completed');

    const buttons = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));
  });

  it('with no tasks at all and no filters, the normal empty state is unchanged', async () => {
    fakeList([]);
    renderApp('/dashboard');
    expect(await screen.findByText('No tasks found')).toBeInTheDocument();
    expect(screen.queryByText('No matching tasks')).not.toBeInTheDocument();
  });

  it('keeps the selected filters when a request fails, and "Try again" reuses them', async () => {
    const user = userEvent.setup();
    await openDashboard();
    vi.mocked(taskService.list).mockRejectedValueOnce(new ApiError('Cannot reach the server.', { status: 0 }));

    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(within(filterBar()).getByLabelText('Priority')).toHaveValue('High');

    fakeList();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(lastCall()).toMatchObject({ priority: 'High' });
  });

  it('a task edited so that it no longer matches leaves the filtered list', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ message: 'Task updated', task: { ...ALL[0], status: 'Completed' } });
    const user = userEvent.setup();
    await openDashboard();
    await user.selectOptions(within(filterBar()).getByLabelText('Status'), 'Pending');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Mark Alpha as Completed' }));

    expect(await screen.findByText('No matching tasks')).toBeInTheDocument();
  });

  it('a new task that the filters would hide is saved but not shown', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ message: 'Task created', task: task({ id: 'n', title: 'Hidden', status: 'Pending', priority: 'Low' }) });
    const user = userEvent.setup();
    await openDashboard();
    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: 'New task' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Hidden');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(taskService.create).toHaveBeenCalled();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('a new task that matches the filters is shown at the top', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ message: 'Task created', task: task({ id: 'n', title: 'Shown', priority: 'High' }) });
    const user = userEvent.setup();
    await openDashboard();
    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: 'New task' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Shown');
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'High');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Shown')).toBeInTheDocument();
  });
});
