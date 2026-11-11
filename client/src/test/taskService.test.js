import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { taskService } from '../services/taskService';

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('taskService.list (FR-10)', () => {
  it('requests /tasks with no query string when there are no filters', async () => {
    await taskService.list();
    expect(api.get).toHaveBeenCalledWith('/tasks', {});
    await taskService.list({ status: '', priority: '' });
    expect(api.get).toHaveBeenLastCalledWith('/tasks', {});
  });

  it('adds ?status= and ?priority=, encoding spaces', async () => {
    await taskService.list({ status: 'In Progress' });
    expect(api.get).toHaveBeenLastCalledWith('/tasks?status=In+Progress', {});
    await taskService.list({ priority: 'High' });
    expect(api.get).toHaveBeenLastCalledWith('/tasks?priority=High', {});
    await taskService.list({ status: 'Pending', priority: 'Low' });
    expect(api.get).toHaveBeenLastCalledWith('/tasks?status=Pending&priority=Low', {});
  });

  it('passes the abort signal through but never as a filter', async () => {
    const controller = new AbortController();
    await taskService.list({ status: 'Completed', signal: controller.signal });
    expect(api.get).toHaveBeenCalledWith('/tasks?status=Completed', { signal: controller.signal });
  });
});
