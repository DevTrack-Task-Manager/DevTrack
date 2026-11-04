'use strict';

const request = require('supertest');
const Task = require('../../models/Task');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { loginAs } = require('../helpers/factories');

const app = createApp();
const STATUS_MESSAGE = 'Status must be Pending, In Progress or Completed';

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

describe('Task status workflow (Issue #5, FR-08)', () => {
  test('IT_27 / UT_09: a new task defaults to Pending', async () => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'Default status' });
    expect(res.status).toBe(201);
    expect(res.body.task.status).toBe('Pending');
  });

  test.each(['Pending', 'In Progress', 'Completed'])('a task can be created with status %s', async (status) => {
    const { api } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'x', status });
    expect(res.status).toBe(201);
    expect(res.body.task.status).toBe(status);
  });

  test('IT_28: PUT updates the status, persists it and changes nothing else', async () => {
    const { api } = await setup();
    const created = (await api.post('/api/tasks').send({ title: 'Keep me', description: 'notes', priority: 'High', dueDate: '2026-12-31' })).body.task;

    const res = await api.put(`/api/tasks/${created.id}`).send({ status: 'In Progress' });

    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({
      id: created.id,
      title: 'Keep me',
      description: 'notes',
      priority: 'High',
      status: 'In Progress',
    });
    expect(res.body.task.dueDate).toBe(created.dueDate);
    expect((await Task.findById(created.id)).status).toBe('In Progress');
  });

  test('the whole workflow works in any direction: Pending -> In Progress -> Completed -> Pending', async () => {
    const { api } = await setup();
    const { id } = (await api.post('/api/tasks').send({ title: 'Walk' })).body.task;
    for (const status of ['In Progress', 'Completed', 'Pending', 'Completed']) {
      const res = await api.put(`/api/tasks/${id}`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe(status);
    }
  });

  test('updating a status moves updatedAt forward and keeps createdAt', async () => {
    const { api } = await setup();
    const created = (await api.post('/api/tasks').send({ title: 'Clock' })).body.task;
    await new Promise((resolve) => setTimeout(resolve, 15));
    const updated = (await api.put(`/api/tasks/${created.id}`).send({ status: 'Completed' })).body.task;
    expect(updated.createdAt).toBe(created.createdAt);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(created.updatedAt).getTime());
  });

  test.each(['Archived', 'completed', 'IN PROGRESS', 'Done', '', null, 3, ['Pending'], { $ne: 'x' }])(
    'IT_29: PUT rejects status %p with 400 and leaves the task alone',
    async (status) => {
      const { api } = await setup();
      const { id } = (await api.post('/api/tasks').send({ title: 'Stay' })).body.task;

      const res = await api.put(`/api/tasks/${id}`).send({ status });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(STATUS_MESSAGE);
      expect(res.body.fields).toEqual({ status: STATUS_MESSAGE });
      expect((await Task.findById(id)).status).toBe('Pending');
    }
  );

  test('IT_29: POST rejects an invalid status with 400 and saves nothing', async () => {
    const { api, user } = await setup();
    const res = await api.post('/api/tasks').send({ title: 'x', status: 'Archived' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(STATUS_MESSAGE);
    expect(await Task.countDocuments({ userId: user._id })).toBe(0);
  });

  test('IT_30: the API shows the same status in the list and on the single result', async () => {
    const { api } = await setup();
    const { id } = (await api.post('/api/tasks').send({ title: 'Consistent' })).body.task;
    const put = await api.put(`/api/tasks/${id}`).send({ status: 'Completed' });
    const list = await api.get('/api/tasks');
    expect(list.body.tasks.find((t) => t.id === id).status).toBe(put.body.task.status);
  });

  test("another user cannot change a task's status (404) (FR-11)", async () => {
    const owner = await setup();
    const { id } = (await owner.api.post('/api/tasks').send({ title: 'Mine' })).body.task;
    const { token: otherToken } = await loginAs(app, { email: 'intruder@demo.com' });

    const res = await as(otherToken).put(`/api/tasks/${id}`).send({ status: 'Completed' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
    expect((await Task.findById(id)).status).toBe('Pending');
  });
});

describe('Status is enforced at the database layer too, independent of the API validators', () => {
  test('Task.create refuses an unsupported status or priority', async () => {
    const { user } = await setup();
    await expect(Task.create({ userId: user._id, title: 'x', status: 'Archived' })).rejects.toMatchObject({ name: 'ValidationError' });
    await expect(Task.create({ userId: user._id, title: 'x', priority: 'Urgent' })).rejects.toMatchObject({ name: 'ValidationError' });
  });

  test('findOneAndUpdate with runValidators refuses an unsupported status', async () => {
    const { user } = await setup();
    const task = await Task.create({ userId: user._id, title: 'x' });
    await expect(
      Task.findOneAndUpdate({ _id: task._id }, { $set: { status: 'Archived' } }, { new: true, runValidators: true })
    ).rejects.toMatchObject({ name: 'ValidationError' });
    expect((await Task.findById(task._id)).status).toBe('Pending');
  });

  test('a stored task defaults to Pending and Medium', async () => {
    const { user } = await setup();
    const task = await Task.create({ userId: user._id, title: 'defaults' });
    expect(task.status).toBe('Pending');
    expect(task.priority).toBe('Medium');
  });
});
