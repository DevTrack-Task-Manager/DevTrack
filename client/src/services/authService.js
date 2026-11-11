import { api } from './api';

/** Thin wrappers over the auth endpoints (TDD 4.1). */
export const authService = {
  register: ({ name, email, password }) => api.post('/auth/register', { name, email, password }, { auth: false }),
  login: ({ email, password }) => api.post('/auth/login', { email, password }, { auth: false }),
  me: () => api.get('/auth/me'),
  updateProfile: ({ name, email, currentPassword }) => api.put('/auth/me', { name, email, currentPassword }),
  logout: () => api.post('/auth/logout'),
};
