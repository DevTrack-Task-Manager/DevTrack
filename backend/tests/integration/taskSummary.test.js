'use strict';

const request = require('supertest');
const Task = require('../../models/Task');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { loginAs } = require('../helpers/factories');

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const list = (token, query = '') => request(app).get(`/api/tasks${query}`).set('Authorization', `Bearer ${token}`);

describe('GET /api/tasks summary (dashboard counters)', () => {
  test('a user with no tasks gets zero counts for every status and priority', async () => {
    const { token } = await loginAs(app);
    const res = await list(token);
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      total: 0,
      byStatus: { Pending: 0, 'In Progress': 0, Completed: 0 },
      byPriority: { Low: 0, Medium: 0, High: 0 },
    });
  });

  test('counts every status and priority of the whole list', async () => {
    const { token, user } = await loginAs(app);
    await Task.insertMany([
      { userId: user._id, title: 'a', status: 'Pending', priority: 'High' },
      { userId: user._id, title: 'b', status: 'Pending', priority: 'Low' },
      { userId: user._id, title: 'c', status: 'In Progress', priority: 'High' },
      { userId: user._id, title: 'd', status: 'Completed', priority: 'Medium' },
    ]);
    const { summary } = (await list(token)).body;
    expect(summary.total).toBe(4);
    expect(summary.byStatus).toEqual({ Pending: 2, 'In Progress': 1, Completed: 1 });
    expect(summary.byPriority).toEqual({ Low: 1, Medium: 1, High: 2 });
  });

  test('filters narrow the list but never the summary', async () => {
    const { token, user } = await loginAs(app);
    await Task.insertMany([
      { userId: user._id, title: 'a', status: 'Pending', priority: 'High' },
      { userId: user._id, title: 'b', status: 'Completed', priority: 'Low' },
      { userId: user._id, title: 'c', status: 'Completed', priority: 'High' },
    ]);
    const all = (await list(token)).body.summary;
    const filtered = await list(token, '?status=Completed&priority=High');
    expect(filtered.body.count).toBe(1);
    expect(filtered.body.summary).toEqual(all);
    expect(filtered.body.summary.total).toBe(3);
  });

  test("never counts another user's tasks (FR-11)", async () => {
    const { token, user } = await loginAs(app);
    const { user: other } = await loginAs(app, { email: 'other@demo.com' });
    await Task.insertMany([
      { userId: user._id, title: 'mine', status: 'Pending' },
      { userId: other._id, title: 'theirs 1', status: 'Pending' },
      { userId: other._id, title: 'theirs 2', status: 'Completed' },
    ]);
    const { summary } = (await list(token)).body;
    expect(summary.total).toBe(1);
    expect(summary.byStatus).toEqual({ Pending: 1, 'In Progress': 0, Completed: 0 });
  });
});
