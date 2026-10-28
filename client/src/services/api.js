import { getToken } from './tokenStore';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Error thrown for every failed request. `status` is 0 when the server could not be reached. */
export class ApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields ?? {};
  }
}

let unauthorizedHandler = null;

/**
 * Registers the function called when an authenticated request comes back 401
 * (expired or invalid token). AuthContext uses it to clear the session and redirect to login.
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // Read synchronously so callers can clear the stored token right after starting a request.
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', { status: 0 });
  }

  const data = await parseBody(response);

  if (!response.ok) {
    const error = new ApiError(data?.error || `Request failed (${response.status})`, {
      status: response.status,
      fields: data?.fields,
    });
    // A 401 on a request that carried a token means the session is no longer valid.
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler(error);
    throw error;
  }
  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body: body ?? {} }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body: body ?? {} }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body: body ?? {} }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
