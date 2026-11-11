import { api } from './api';

/**
 * Thin wrappers over the task endpoints (TDD 4.2). The JWT is attached by `api`, and a 401
 * triggers the sign-out handler registered by AuthContext.
 *
 *   list    -> { tasks, count }; optional { status, priority } become ?status= & ?priority= (FR-10)
 *   create  -> { message, task }
 *   update  -> { message, task }
 *   remove  -> { message, id }
 */
export const taskService = {
  list: ({ status, priority, ...options } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    const query = params.toString();
    return api.get(query ? `/tasks?${query}` : '/tasks', options);
  },
  create: (task) => api.post('/tasks', task),
  update: (id, changes) => api.put(`/tasks/${encodeURIComponent(id)}`, changes),
  remove: (id) => api.delete(`/tasks/${encodeURIComponent(id)}`),
};
