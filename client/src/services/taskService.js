import { api } from './api';

/**
 * Thin wrappers over the task endpoints (TDD 4.2). The JWT is attached by `api`, and a 401
 * triggers the sign-out handler registered by AuthContext.
 *
 *   list    -> { tasks, count }
 *   create  -> { message, task }
 *   update  -> { message, task }
 *   remove  -> { message, id }
 */
export const taskService = {
  list: (options) => api.get('/tasks', options),
  create: (task) => api.post('/tasks', task),
  update: (id, changes) => api.put(`/tasks/${encodeURIComponent(id)}`, changes),
  remove: (id) => api.delete(`/tasks/${encodeURIComponent(id)}`),
};
