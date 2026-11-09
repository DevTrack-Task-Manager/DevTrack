'use strict';

const request = require('supertest');
const Task = require('../../models/Task');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { loginAs } = require('../helpers/factories');

const app = createApp();
const PRIORITY_MESSAGE = 'Priority must be Low, Medium or High';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const as = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
});

async function setup() {
  const { token, user } = await loginAs(app);
  return { api: as(token), user };
}

describe('Task priority management (Issue #6, FR-09)', () => {
  test('IT_31: a new task defaults to Medium', async () => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'Default priority' });
    expect(res.status).toBe(201);
    expect(res.body.task.priority).toBe('Medium');
  });

  test.each(['Low', 'Medium', 'High'])('a task can be created with priority %s', async (priority) => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'x', priority });
    expect(res.status).toBe(201);
    expect(res.body.task.priority).toBe(priority);
  });

  test('IT_32: PUT updates only the priority and persists it', async () => {
    const { api } = await setup();
    const created = (await api.post('/api/tasks').send({ title: 'Keep me', description: 'notes', status: 'In Progress' })).body.task;

    const res = await api.put(`/api/tasks/${created.id}`).send({ priority: 'High' });

    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({ id: created.id, title: 'Keep me', description: 'notes', status: 'In Progress', priority: 'High' });
    expect((await Task.findById(created.id)).priority).toBe('High');
  });

  test('priority can move between every value in any direction', async () => {
    const { api } = await setup();
    const { id } = (await api.post('/api/tasks').send({ title: 'Walk' })).body.task;
    for (const priority of ['High', 'Low', 'Medium', 'Low']) {
      const res = await api.put(`/api/tasks/${id}`).send({ priority });
      expect(res.status).toBe(200);
      expect(res.body.task.priority).toBe(priority);
    }
  });

  test.each(['Urgent!!', 'high', 'LOW', 'Critical', 'Normal', '', null, 1, ['High'], { $ne: 'x' }])(
    'IT_15: PUT rejects priority %p with 400 and leaves the task alone',
    async (priority) => {
      const { api } = await setup();
      const { id } = (await api.post('/api/tasks').send({ title: 'Stay' })).body.task;

      const res = await api.put(`/api/tasks/${id}`).send({ priority });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(PRIORITY_MESSAGE);
      expect(res.body.fields).toEqual({ priority: PRIORITY_MESSAGE });
      expect((await Task.findById(id)).priority).toBe('Medium');
    }
  );

  test('IT_15: POST rejects an invalid priority with 400 and saves nothing', async () => {
    const { api, user } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'x', priority: 'Urgent!!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(PRIORITY_MESSAGE);
    expect(await Task.countDocuments({ userId: user._id })).toBe(0);
  });

  test('IT_33: the list shows the same priority as the update response', async () => {
    const { api } = await setup();
    const { id } = (await api.post('/api/tasks').send({ title: 'Consistent' })).body.task;
    const put = await api.put(`/api/tasks/${id}`).send({ priority: 'Low' });
    const list = await api.get('/api/tasks');
    expect(list.body.tasks.find((t) => t.id === id).priority).toBe(put.body.task.priority);
  });

  test("another user cannot change a task's priority (404) (FR-11)", async () => {
    const owner = await setup();
    const { id } = (await owner.api.post('/api/tasks').send({ title: 'Mine' })).body.task;
    const { token: otherToken } = await loginAs(app, { email: 'intruder@demo.com' });

    const res = await as(otherToken).put(`/api/tasks/${id}`).send({ priority: 'High' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
    expect((await Task.findById(id)).priority).toBe('Medium');
  });

  test('priority is enforced at the database layer too', async () => {
    const { user } = await setup();
    const task = await Task.create({ userId: user._id, title: 'x' });
    await expect(
      Task.findOneAndUpdate({ _id: task._id }, { $set: { priority: 'Urgent' } }, { new: true, runValidators: true })
    ).rejects.toMatchObject({ name: 'ValidationError' });
    expect((await Task.findById(task._id)).priority).toBe('Medium');
  });
});
