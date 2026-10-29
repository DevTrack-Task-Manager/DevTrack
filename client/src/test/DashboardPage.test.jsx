import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

const TASKS = [
  task({ id: 't1', title: 'Write report', status: 'Pending', priority: 'Medium' }),
  task({ id: 't2', title: 'Fix login bug', status: 'In Progress', priority: 'High', description: 'Users see a blank page' }),
  task({ id: 't3', title: 'Update docs', status: 'Completed', priority: 'Low' }),
];

async function openDashboard() {
  renderApp('/dashboard');
  await screen.findByRole('heading', { name: 'Hi, Priya.' });
}

beforeEach(() => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'a.b.c', expiresAt: future() }));
  vi.mocked(authService.me).mockResolvedValue({ user: USER });
  vi.mocked(authService.logout).mockResolvedValue({});
  vi.mocked(taskService.list).mockResolvedValue({ tasks: TASKS, count: TASKS.length });
});

describe('Dashboard: list, labels and counters', () => {
  it('shows a loading state while tasks are being fetched', async () => {
    let resolve;
    vi.mocked(taskService.list).mockReturnValue(new Promise((r) => (resolve = r)));
    await openDashboard();

    expect(screen.getByText('Loading your tasks')).toBeInTheDocument();
    resolve({ tasks: [], count: 0 });
    expect(await screen.findByText('No tasks found')).toBeInTheDocument();
    expect(screen.queryByText('Loading your tasks')).not.toBeInTheDocument();
  });

  it('shows the empty state with a way to create the first task', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [], count: 0 });
    await openDashboard();

    expect(await screen.findByText('No tasks found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a task' })).toBeInTheDocument();
  });

  it('shows an error banner and recovers with "Try again"', async () => {
    vi.mocked(taskService.list)
      .mockRejectedValueOnce(new ApiError('Cannot reach the server.', { status: 0 }))
      .mockResolvedValueOnce({ tasks: TASKS, count: 3 });
    const user = userEvent.setup();
    await openDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders every task with text labels for status and priority', async () => {
    await openDashboard();
    const list = await screen.findByRole('list', { name: 'Tasks' });
    const items = within(list).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Pending')).toBeInTheDocument();
    expect(within(items[0]).getByText('Medium priority')).toBeInTheDocument();
    expect(within(items[1]).getByText('In Progress')).toBeInTheDocument();
    expect(within(items[1]).getByText('High priority')).toBeInTheDocument();
    expect(within(items[1]).getByText('Users see a blank page')).toBeInTheDocument();
    expect(within(items[2]).getByText('Completed')).toBeInTheDocument();
    expect(within(items[2]).getByText('Low priority')).toBeInTheDocument();
  });

  it('shows summary counters for the total and each status', async () => {
    vi.mocked(taskService.list).mockResolvedValue({
      tasks: [...TASKS, task({ id: 't4', title: 'Another', status: 'Pending' })],
      count: 4,
    });
    await openDashboard();

    const summary = await screen.findByRole('region', { name: 'Task summary' });
    const value = (label) => within(summary).getByText(label).parentElement.querySelector('dd');
    expect(value('Total')).toHaveTextContent('4');
    expect(value('Pending')).toHaveTextContent('2');
    expect(value('In Progress')).toHaveTextContent('1');
    expect(value('Completed')).toHaveTextContent('1');
  });

  it('flags an open task whose due date has passed as overdue, with text', async () => {
    vi.mocked(taskService.list).mockResolvedValue({
      tasks: [task({ dueDate: '2020-01-01T00:00:00.000Z' }), task({ id: 't2', title: 'Done old', status: 'Completed', dueDate: '2020-01-01T00:00:00.000Z' })],
      count: 2,
    });
    await openDashboard();

    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]).getByText('Overdue')).toBeInTheDocument();
    expect(within(items[1]).queryByText('Overdue')).not.toBeInTheDocument();
  });
});

describe('Dashboard: create', () => {
  it('validates the title inline and does not call the API', async () => {
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog', { name: 'New task' });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(within(dialog).getByText('Title is required')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Title')).toHaveFocus();
    expect(taskService.create).not.toHaveBeenCalled();
  });

  it('creates a task, closes the dialog and adds it to the top of the list', async () => {
    const created = task({ id: 'new', title: 'Plan sprint', priority: 'High', dueDate: '2026-12-31T00:00:00.000Z' });
    vi.mocked(taskService.create).mockResolvedValue({ message: 'Task created', task: created });
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), '  Plan sprint ');
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'High');
    fireEvent.change(within(dialog).getByLabelText('Due date (optional)'), { target: { value: '2026-12-31' } });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(taskService.create).toHaveBeenCalledWith({
      title: 'Plan sprint',
      description: '',
      status: 'Pending',
      priority: 'High',
      dueDate: '2026-12-31',
    });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('Plan sprint')).toBeInTheDocument();
  });

  it('keeps the dialog open and shows the server\'s field error when the save fails', async () => {
    vi.mocked(taskService.create).mockRejectedValue(
      new ApiError('Title must be at most 120 characters', { status: 400, fields: { title: 'Title must be at most 120 characters' } })
    );
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Valid title');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect((await within(dialog).findAllByText('Title must be at most 120 characters')).length).toBeGreaterThan(0);
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Valid title');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a connection error inside the dialog without losing input', async () => {
    vi.mocked(taskService.create).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'New task' }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Keep me');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Keep me');
  });

  it('Escape and Cancel close the dialog without saving', async () => {
    const user = userEvent.setup();
    await openDashboard();
    const opener = await screen.findByRole('button', { name: 'New task' });

    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(taskService.create).not.toHaveBeenCalled();
  });
});

describe('Dashboard: edit', () => {
  it('opens prefilled, saves the changes and updates the card', async () => {
    const updated = { ...TASKS[0], title: 'Write final report', status: 'In Progress' };
    vi.mocked(taskService.update).mockResolvedValue({ message: 'Task updated', task: updated });
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'Edit Write report' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Write report');
    expect(within(dialog).getByLabelText('Status')).toHaveValue('Pending');
    expect(within(dialog).getByLabelText('Priority')).toHaveValue('Medium');

    await user.clear(within(dialog).getByLabelText('Title'));
    await user.type(within(dialog).getByLabelText('Title'), 'Write final report');
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'In Progress');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(taskService.update).toHaveBeenCalledWith('t1', {
      title: 'Write final report',
      description: '',
      status: 'In Progress',
      priority: 'Medium',
      dueDate: null,
    });
    expect(screen.getByText('Write final report')).toBeInTheDocument();
    expect(screen.queryByText('Write report')).not.toBeInTheDocument();
  });

  it('removes a task from the screen when the server says it no longer exists (404)', async () => {
    vi.mocked(taskService.update).mockRejectedValue(new ApiError('Task not found', { status: 404 }));
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'Edit Write report' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save changes' }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Task not found');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('Dashboard: delete', () => {
  it('asks for confirmation, then deletes and removes the card', async () => {
    vi.mocked(taskService.remove).mockResolvedValue({ message: 'Task deleted', id: 't1' });
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'Delete Write report' }));

    expect(taskService.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    await waitFor(() => expect(screen.queryByText('Write report')).not.toBeInTheDocument());
    expect(taskService.remove).toHaveBeenCalledWith('t1');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('Cancel keeps the task and calls nothing', async () => {
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'Delete Write report' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(taskService.remove).not.toHaveBeenCalled();
    expect(screen.getByText('Write report')).toBeInTheDocument();
  });

  it('shows an error banner and keeps the task when the delete fails', async () => {
    vi.mocked(taskService.remove).mockRejectedValue(new ApiError('Cannot reach the server.', { status: 0 }));
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'Delete Write report' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(screen.getByText('Write report')).toBeInTheDocument();
  });

  it('deleting the last task shows the empty state', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ tasks: [TASKS[0]], count: 1 });
    vi.mocked(taskService.remove).mockResolvedValue({ message: 'Task deleted', id: 't1' });
    const user = userEvent.setup();
    await openDashboard();
    await user.click(await screen.findByRole('button', { name: 'Delete Write report' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('No tasks found')).toBeInTheDocument();
  });
});
