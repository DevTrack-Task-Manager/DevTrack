import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  task({ id: 'a', title: 'Alpha', description: 'quarterly numbers', status: 'Pending', priority: 'High', createdAt: '2026-10-03T00:00:00.000Z' }),
  task({ id: 'b', title: 'Bravo', status: 'In Progress', priority: 'Low', createdAt: '2026-10-02T00:00:00.000Z', dueDate: '2026-11-20T00:00:00.000Z' }),
  task({ id: 'c', title: 'Charlie', status: 'Completed', priority: 'Medium', createdAt: '2026-10-01T00:00:00.000Z' }),
];

function fakeList(source = ALL) {
  vi.mocked(taskService.list).mockImplementation(async ({ status, priority } = {}) => {
    const tasks = source.filter((x) => (!status || x.status === status) && (!priority || x.priority === priority));
    const count = (key, value) => source.filter((x) => x[key] === value).length;
    return {
      tasks,
      count: tasks.length,
      summary: {
        total: source.length,
        byStatus: { Pending: count('status', 'Pending'), 'In Progress': count('status', 'In Progress'), Completed: count('status', 'Completed') },
        byPriority: { Low: count('priority', 'Low'), Medium: count('priority', 'Medium'), High: count('priority', 'High') },
      },
    };
  });
}

const titlesShown = () => within(screen.getByRole('list', { name: 'Tasks' })).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const statValue = (label) => within(screen.getByRole('region', { name: 'Task summary' })).getByText(label).parentElement.querySelector('dd').textContent;
const filterBar = () => screen.getByRole('group', { name: 'Filter tasks' });

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

describe('Dashboard layout', () => {
  it('has no Session side panel: the tasks panel is the only panel', async () => {
    await openDashboard();
    expect(screen.queryByRole('heading', { name: 'Session' })).not.toBeInTheDocument();
    expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
    expect(screen.queryByText('Session ends')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your tasks' })).toBeInTheDocument();
  });

  it('shows the completion progress for the whole list', async () => {
    await openDashboard();
    const bar = screen.getByRole('progressbar', { name: 'Completed share of all tasks' });
    expect(bar).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
  });

  it('the top bar links to Tasks and Profile and shows the user', async () => {
    await openDashboard();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'Priya S, your profile' })).toHaveAttribute('href', '/profile');
  });
});

describe('Summary cards are filter shortcuts', () => {
  it('pressing a card filters by that status and the counts do not change', async () => {
    const user = userEvent.setup();
    await openDashboard();

    await user.click(screen.getByRole('button', { name: 'Show In Progress tasks' }));

    await waitFor(() => expect(titlesShown()).toEqual(['Bravo']));
    expect(taskService.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'In Progress' }));
    expect(screen.getByRole('button', { name: 'Show In Progress tasks' })).toHaveAttribute('aria-pressed', 'true');
    expect(statValue('Total')).toBe('3');
    expect(statValue('Pending')).toBe('1');
    expect(statValue('Completed')).toBe('1');
    expect(within(filterBar()).getByLabelText('Status')).toHaveValue('In Progress');
  });

  it('pressing the active card again, or Total, shows everything', async () => {
    const user = userEvent.setup();
    await openDashboard();
    await user.click(screen.getByRole('button', { name: 'Show Pending tasks' }));
    await waitFor(() => expect(titlesShown()).toEqual(['Alpha']));

    await user.click(screen.getByRole('button', { name: 'Show Pending tasks' }));
    await waitFor(() => expect(titlesShown()).toHaveLength(3));

    await user.click(screen.getByRole('button', { name: 'Show Completed tasks' }));
    await waitFor(() => expect(titlesShown()).toEqual(['Charlie']));
    await user.click(screen.getByRole('button', { name: 'Show all tasks' }));
    await waitFor(() => expect(titlesShown()).toHaveLength(3));
  });

  it('counters follow edits: completing a task moves it between cards', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ message: 'Task updated', task: { ...ALL[0], status: 'Completed' } });
    const user = userEvent.setup();
    await openDashboard();

    await user.click(screen.getByRole('button', { name: 'Mark Alpha as Completed' }));

    await waitFor(() => expect(statValue('Completed')).toBe('2'));
    expect(statValue('Pending')).toBe('0');
    expect(statValue('Total')).toBe('3');
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('counters follow create and delete', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ message: 'Task created', task: task({ id: 'n', title: 'Delta', status: 'Pending' }) });
    vi.mocked(taskService.remove).mockResolvedValue({});
    const user = userEvent.setup();
    await openDashboard();

    await user.click(screen.getByRole('button', { name: 'New task' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Title'), 'Delta');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(statValue('Total')).toBe('4'));
    expect(statValue('Pending')).toBe('2');

    await user.click(screen.getByRole('button', { name: 'Delete Delta' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(statValue('Total')).toBe('3'));
    expect(statValue('Pending')).toBe('1');
  });
});

describe('Search and sort', () => {
  it('search narrows the list by title or description, without calling the server again', async () => {
    const user = userEvent.setup();
    await openDashboard();
    const calls = vi.mocked(taskService.list).mock.calls.length;

    await user.type(screen.getByLabelText('Search'), 'QUARTERLY');
    expect(titlesShown()).toEqual(['Alpha']);
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search'));
    await user.type(screen.getByLabelText('Search'), 'bra');
    expect(titlesShown()).toEqual(['Bravo']);
    expect(taskService.list).toHaveBeenCalledTimes(calls);
  });

  it('search with no hits shows "No matching tasks" and Clear filters resets it', async () => {
    const user = userEvent.setup();
    await openDashboard();
    await user.type(screen.getByLabelText('Search'), 'zzz');

    expect(screen.getByText('No matching tasks')).toBeInTheDocument();
    await user.click(within(filterBar()).getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(titlesShown()).toHaveLength(3);
  });

  it('search combines with the server-side filters', async () => {
    const user = userEvent.setup();
    await openDashboard();
    await user.selectOptions(within(filterBar()).getByLabelText('Priority'), 'High');
    await waitFor(() => expect(titlesShown()).toEqual(['Alpha']));
    await user.type(screen.getByLabelText('Search'), 'bravo');
    expect(screen.getByText('No matching tasks')).toBeInTheDocument();
  });

  it.each([
    ['Newest first', ['Alpha', 'Bravo', 'Charlie']],
    ['Oldest first', ['Charlie', 'Bravo', 'Alpha']],
    ['Priority (high first)', ['Alpha', 'Charlie', 'Bravo']],
    ['Status (open first)', ['Bravo', 'Alpha', 'Charlie']],
    ['Due date (soonest)', ['Bravo', 'Alpha', 'Charlie']],
    ['Title (A to Z)', ['Alpha', 'Bravo', 'Charlie']],
  ])('sort by %s', async (label, expected) => {
    const user = userEvent.setup();
    await openDashboard();
    await user.selectOptions(screen.getByLabelText('Sort by'), label);
    expect(titlesShown()).toEqual(expected);
  });

  it('sorting does not call the server and does not count as an active filter', async () => {
    const user = userEvent.setup();
    await openDashboard();
    const calls = vi.mocked(taskService.list).mock.calls.length;
    await user.selectOptions(screen.getByLabelText('Sort by'), 'Title (A to Z)');
    expect(taskService.list).toHaveBeenCalledTimes(calls);
    expect(within(filterBar()).getByRole('button', { name: 'Clear filters' })).toBeDisabled();
  });
});
