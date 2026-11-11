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
const titles = (res) => res.body.tasks.map((t) => t.title).sort();

/** Six tasks for the signed-in user (every status/priority combination that matters) plus three for another user. */
async function seed() {
  const { token, user } = await loginAs(app);
  const { token: otherToken, user: other } = await loginAs(app, { email: 'other@demo.com' });
  const mine = [
    ['P-Low', 'Pending', 'Low'],
    ['P-High', 'Pending', 'High'],
    ['IP-High', 'In Progress', 'High'],
    ['IP-Med', 'In Progress', 'Medium'],
    ['C-Low', 'Completed', 'Low'],
    ['C-High', 'Completed', 'High'],
  ];
  const theirs = [
    ['X-P-High', 'Pending', 'High'],
    ['X-C-Low', 'Completed', 'Low'],
    ['X-IP-Med', 'In Progress', 'Medium'],
  ];
  await Task.insertMany([
    ...mine.map(([title, status, priority]) => ({ userId: user._id, title, status, priority })),
    ...theirs.map(([title, status, priority]) => ({ userId: other._id, title, status, priority })),
  ]);
  return { token, otherToken };
}

describe('GET /api/tasks filters (Issue #7, FR-10)', () => {
  test('no filters returns all of my tasks and none of anyone else', async () => {
    const { token } = await seed();
    const res = await list(token);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(6);
    expect(titles(res)).toEqual(['C-High', 'C-Low', 'IP-High', 'IP-Med', 'P-High', 'P-Low']);
  });

  test('IT_34: ?status= returns only my tasks with that status', async () => {
    const { token } = await seed();
    expect(titles(await list(token, '?status=Pending'))).toEqual(['P-High', 'P-Low']);
    expect(titles(await list(token, '?status=In%20Progress'))).toEqual(['IP-High', 'IP-Med']);
    expect(titles(await list(token, '?status=Completed'))).toEqual(['C-High', 'C-Low']);
  });

  test('IT_35: ?priority= returns only my tasks with that priority', async () => {
    const { token } = await seed();
    expect(titles(await list(token, '?priority=High'))).toEqual(['C-High', 'IP-High', 'P-High']);
    expect(titles(await list(token, '?priority=Medium'))).toEqual(['IP-Med']);
    expect(titles(await list(token, '?priority=Low'))).toEqual(['C-Low', 'P-Low']);
  });

  test('IT_36: both filters together are combined with AND', async () => {
    const { token } = await seed();
    expect(titles(await list(token, '?status=Pending&priority=High'))).toEqual(['P-High']);
    expect(titles(await list(token, '?status=Completed&priority=Low'))).toEqual(['C-Low']);
    expect(titles(await list(token, '?priority=High&status=In%20Progress'))).toEqual(['IP-High']);
  });

  test('a combination with no matches is 200 with an empty list, not an error', async () => {
    const { token } = await seed();
    const res = await list(token, '?status=Pending&priority=Medium');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tasks: [], count: 0 });
    expect(res.body.summary.total).toBe(6); // the summary describes the whole list, not the filtered one
  });

  test('empty filter values mean "no filter" (cleared dropdowns)', async () => {
    const { token } = await seed();
    expect((await list(token, '?status=&priority=')).body.count).toBe(6);
    expect(titles(await list(token, '?status=&priority=Medium'))).toEqual(['IP-Med']);
  });

  test('count matches the number of tasks returned', async () => {
    const { token } = await seed();
    const res = await list(token, '?status=Completed');
    expect(res.body.count).toBe(res.body.tasks.length);
  });

  test('filtered results keep the newest-first order', async () => {
    const { token } = await seed();
    const res = await list(token, '?priority=High');
    const times = res.body.tasks.map((t) => new Date(t.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  test('every returned task carries the fields the dashboard needs', async () => {
    const { token } = await seed();
    const [task] = (await list(token, '?status=Pending&priority=High')).body.tasks;
    expect(task).toMatchObject({ title: 'P-High', status: 'Pending', priority: 'High' });
    expect(task).toHaveProperty('id');
    expect(task).not.toHaveProperty('_id');
  });
});

describe('IT_37: filters never widen access (FR-11)', () => {
  test("filtered lists only contain the caller's tasks, for either user", async () => {
    const { token, otherToken } = await seed();
    expect(titles(await list(otherToken, '?status=Pending&priority=High'))).toEqual(['X-P-High']);
    expect(titles(await list(otherToken))).toEqual(['X-C-Low', 'X-IP-Med', 'X-P-High']);
    for (const query of ['?status=Pending', '?priority=High', '?status=Completed&priority=Low', '']) {
      const res = await list(token, query);
      expect(res.body.tasks.every((t) => !t.title.startsWith('X-'))).toBe(true);
    }
  });

  test('a userId in the query string cannot select another user', async () => {
    const { token } = await seed();
    const other = await Task.findOne({ title: 'X-P-High' });
    const res = await list(token, `?userId=${other.userId}&status=Pending`);
    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['P-High', 'P-Low']);
  });

  test('operator injection through the query string is a 400, not a wider query', async () => {
    const { token } = await seed();
    for (const query of ['?status[$ne]=Completed', '?priority[$exists]=true', '?status[$regex]=.*', '?status=Pending&status=Completed']) {
      const res = await list(token, query);
      expect(res.status).toBe(400);
      expect(Object.keys(res.body)).toEqual(expect.arrayContaining(['error']));
    }
  });
});

describe('Invalid filters -> 400 in the standard error shape (FR-12)', () => {
  test.each([
    ['?status=Archived', 'Status must be Pending, In Progress or Completed'],
    ['?status=pending', 'Status must be Pending, In Progress or Completed'],
    ['?priority=Urgent', 'Priority must be Low, Medium or High'],
    ['?priority=high', 'Priority must be Low, Medium or High'],
  ])('%s', async (query, message) => {
    const { token } = await seed();
    const res = await list(token, query);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|mongoose|CastError/i);
  });

  test('a valid filter plus an invalid one is rejected as a whole', async () => {
    const { token } = await seed();
    const res = await list(token, '?status=Pending&priority=Urgent');
    expect(res.status).toBe(400);
  });

  test('401 comes before filter validation', async () => {
    const res = await request(app).get('/api/tasks?status=Archived');
    expect(res.status).toBe(401);
  });

  test('unknown query parameters are ignored', async () => {
    const { token } = await seed();
    const res = await list(token, '?color=red&page=3');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(6);
  });
});
