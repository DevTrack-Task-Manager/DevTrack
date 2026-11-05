'use strict';

const request = require('supertest');
const Task = require('../../models/Task');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { loginAs } = require('../helpers/factories');

const app = createApp();
const GHOST_ID = 'ffffffffffffffffffffffff'; // well-formed, never exists

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const authed = (token) => ({
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

/** Every error body is exactly `{ error: string }`, optionally with a `fields` map, and nothing else. */
function expectSafeError(res, status) {
  expect(res.status).toBe(status);
  expect(typeof res.body.error).toBe('string');
  expect(res.body.error.length).toBeGreaterThan(0);
  expect(Object.keys(res.body).every((key) => ['error', 'fields'].includes(key))).toBe(true);
  expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules|mongoose|MongoServerError|at \w+ \(/i);
}

async function setup() {
  const { token, user } = await loginAs(app);
  const task = await Task.create({ userId: user._id, title: 'Existing' });
  return { token, user, task, api: authed(token) };
}

describe('Task routes require a token before any validation runs', () => {
  test.each([
    ['get', '/api/tasks'],
    ['post', '/api/tasks'],
    ['put', `/api/tasks/${GHOST_ID}`],
    ['delete', `/api/tasks/${GHOST_ID}`],
  ])('%s %s -> 401', async (method, url) => {
    const res = await request(app)[method](url).send({ title: '' });
    expectSafeError(res, 401);
  });

  test('an invalid id with no token is 401, not 400', async () => {
    expectSafeError(await request(app).delete('/api/tasks/not-an-id'), 401);
  });
});

describe('POST /api/tasks: invalid input -> 400 (IT_42, ST_32-35)', () => {
  test('missing required field (empty body)', async () => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({});
    expectSafeError(res, 400);
    expect(res.body).toEqual({ error: 'Title is required', fields: { title: 'Title is required' } });
  });

  test.each([[''], ['   '], [null]])('blank title %p', async (title) => {
    const { api } = await setup();
    expectSafeError(await api.post('/api/tasks').send({ title }), 400);
  });

  test.each([
    ['title is a number', { title: 42 }, 'title'],
    ['title is an operator object', { title: { $ne: null } }, 'title'],
    ['title is an array', { title: ['a'] }, 'title'],
    ['description is an object', { title: 'x', description: { a: 1 } }, 'description'],
    ['title too long', { title: 'x'.repeat(121) }, 'title'],
    ['description too long', { title: 'x', description: 'x'.repeat(1001) }, 'description'],
    ['invalid status', { title: 'x', status: 'Archived' }, 'status'],
    ['lowercase status', { title: 'x', status: 'pending' }, 'status'],
    ['invalid priority', { title: 'x', priority: 'Urgent!!' }, 'priority'],
    ['numeric priority', { title: 'x', priority: 1 }, 'priority'],
    ['malformed due date', { title: 'x', dueDate: 'tomorrow' }, 'dueDate'],
    ['impossible due date', { title: 'x', dueDate: '2026-02-31' }, 'dueDate'],
    ['due date is a number', { title: 'x', dueDate: 20261231 }, 'dueDate'],
  ])('%s', async (_label, body, field) => {
    const { api, user } = await setup();
    const res = await api.post('/api/tasks').send(body);
    expectSafeError(res, 400);
    expect(res.body.fields).toHaveProperty(field);
    expect(await Task.countDocuments({ userId: user._id })).toBe(1); // only the seeded task: nothing was saved
  });

  test('every invalid field is reported together', async () => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({ title: '', status: 'x', priority: 'y', dueDate: 'z' });
    expectSafeError(res, 400);
    expect(Object.keys(res.body.fields)).toEqual(['title', 'status', 'priority', 'dueDate']);
  });

  test('malformed JSON -> 400 with a safe message', async () => {
    const { token } = await setup();
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{"title": "broken",');
    expectSafeError(res, 400);
    expect(res.body.error).toBe('Malformed JSON in request body');
  });

  test.each([['a JSON string', '"just a string"'], ['a JSON number', '42'], ['null', 'null']])(
    'a body that is %s -> 400',
    async (_label, raw) => {
      const { token } = await setup();
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(raw);
      expectSafeError(res, 400);
    }
  );

  test('a JSON array body -> 400 (title required)', async () => {
    const { api } = await setup();
    expectSafeError(await api.post('/api/tasks').send([{ title: 'x' }]), 400);
  });

  test('a non-JSON content type is treated as an empty body -> 400', async () => {
    const { token } = await setup();
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).set('Content-Type', 'text/plain').send('title=x');
    expectSafeError(res, 400);
  });

  test('an oversized body -> 413 with the standard error shape', async () => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'x', description: 'y'.repeat(20000) });
    expectSafeError(res, 413);
  });

  test('a valid request still succeeds, and the owner comes from the token, not the body', async () => {
    const { api, user } = await setup();
    const res = await api.post('/api/tasks').send({ title: '  New  task ', userId: GHOST_ID });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('New task');
    expect(res.body.task.userId).toBe(user.id);
  });
});

describe('PUT /api/tasks/:id: invalid input -> 400 (IT_43)', () => {
  test('an empty body is rejected', async () => {
    const { api, task } = await setup();
    const res = await api.put(`/api/tasks/${task.id}`).send({});
    expectSafeError(res, 400);
    expect(res.body.error).toBe('Provide at least one field to update');
  });

  test('only unknown fields is the same as an empty body', async () => {
    const { api, task } = await setup();
    expectSafeError(await api.put(`/api/tasks/${task.id}`).send({ foo: 'bar', userId: GHOST_ID }), 400);
  });

  test.each([
    ['blank title', { title: '  ' }, 'title'],
    ['invalid status', { status: 'Archived' }, 'status'],
    ['invalid priority', { priority: 'Critical' }, 'priority'],
    ['malformed due date', { dueDate: '31/12/2026' }, 'dueDate'],
    ['operator injection', { status: { $ne: 'Pending' } }, 'status'],
  ])('%s', async (_label, body, field) => {
    const { api, task } = await setup();
    const res = await api.put(`/api/tasks/${task.id}`).send(body);
    expectSafeError(res, 400);
    expect(res.body.fields).toHaveProperty(field);
    const fresh = await Task.findById(task.id);
    expect(fresh.title).toBe('Existing');
    expect(fresh.status).toBe('Pending');
    expect(fresh.priority).toBe('Medium');
  });

  test('a rejected update leaves the stored task completely unchanged', async () => {
    const { api, task } = await setup();
    await api.put(`/api/tasks/${task.id}`).send({ title: 'Changed', status: 'Archived' });
    expect((await Task.findById(task.id)).title).toBe('Existing');
  });

  test('a valid partial update still succeeds', async () => {
    const { api, task } = await setup();
    const res = await api.put(`/api/tasks/${task.id}`).send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Renamed');
  });
});

describe('Invalid route parameters -> 400 (IT_44)', () => {
  test.each([['123'], ['not-an-id'], ['65f1a2b3c4d5e6f7a8b9c0d'], ['65f1a2b3c4d5e6f7a8b9c0g1'], ['%24ne'], ['null']])(
    'PUT and DELETE /api/tasks/%s',
    async (id) => {
      const { api, task } = await setup();
      const put = await api.put(`/api/tasks/${id}`).send({ title: 'x' });
      expectSafeError(put, 400);
      expect(put.body.error).toBe('Invalid task id');
      const del = await api.delete(`/api/tasks/${id}`);
      expectSafeError(del, 400);
      expect(del.body.error).toBe('Invalid task id');
      expect(await Task.findById(task.id)).not.toBeNull();
    }
  );

  test('a bad id is reported before a bad body', async () => {
    const { api } = await setup();
    const res = await api.put('/api/tasks/nope').send({ status: 'Archived' });
    expect(res.body.error).toBe('Invalid task id');
  });

  test('a well-formed id that does not exist is 404, in the same shape', async () => {
    const { api } = await setup();
    const put = await api.put(`/api/tasks/${GHOST_ID}`).send({ title: 'x' });
    expectSafeError(put, 404);
    expect(put.body).toEqual({ error: 'Task not found' });
    expectSafeError(await api.delete(`/api/tasks/${GHOST_ID}`), 404);
  });

  test("another user's task is also 404 and is never modified (FR-11)", async () => {
    const owner = await setup();
    const { token: otherToken } = await loginAs(app, { email: 'other@demo.com' });
    const other = authed(otherToken);

    const put = await other.put(`/api/tasks/${owner.task.id}`).send({ title: 'Hacked' });
    expectSafeError(put, 404);
    expectSafeError(await other.delete(`/api/tasks/${owner.task.id}`), 404);
    expect((await Task.findById(owner.task.id)).title).toBe('Existing');
  });
});

describe('Unknown routes and methods', () => {
  test('unknown API route -> 404 with the standard shape', async () => {
    const { api } = await setup();
    const res = await api.get('/api/nope');
    expectSafeError(res, 404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });

  test('an unsupported method on a task route -> 404 with the standard shape', async () => {
    const { token, task } = await setup();
    const res = await request(app).patch(`/api/tasks/${task.id}`).set('Authorization', `Bearer ${token}`);
    expectSafeError(res, 404);
  });
});

describe('Auth routes share the same validation and error shape', () => {
  test.each([
    ['register with an empty body', '/api/auth/register', {}],
    ['register with a bad email', '/api/auth/register', { name: 'A', email: 'abc.com', password: 'Test@123' }],
    ['login with an empty body', '/api/auth/login', {}],
    ['login with operator injection', '/api/auth/login', { email: { $gt: '' }, password: { $gt: '' } }],
  ])('%s -> 400', async (_label, url, body) => {
    expectSafeError(await request(app).post(url).send(body), 400);
  });
});
