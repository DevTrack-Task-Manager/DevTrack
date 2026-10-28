'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { VALID_USER, createUser } = require('../helpers/factories');

const app = createApp();
const login = (body, target = app) => request(target).post('/api/auth/login').send(body);

beforeAll(connectTestDb);
afterEach(async () => {
  jest.restoreAllMocks();
  await clearTestDb();
});
afterAll(closeTestDb);

describe('POST /api/auth/login (FR-02, FR-03)', () => {
  test('IT_04: correct credentials return 200 and a JWT', async () => {
    const { user } = await createUser();
    const res = await login({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.user).toMatchObject({ id: user.id, email: 'test@demo.com' });

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload.userId).toBe(user.id);
    expect(new Date(res.body.expiresAt).getTime()).toBe(payload.exp * 1000);
  });

  test('IT_04: email matching ignores case and surrounding whitespace', async () => {
    await createUser();
    const res = await login({ email: '  TEST@DEMO.com ', password: VALID_USER.password });
    expect(res.status).toBe(200);
  });

  test('IT_04: the login response never contains the password hash', async () => {
    await createUser();
    const res = await login({ email: VALID_USER.email, password: VALID_USER.password });
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
    expect(res.body.user).not.toHaveProperty('password');
  });

  test("IT_05: wrong password -> 401 'Invalid credentials' and no token", async () => {
    await createUser();
    const res = await login({ email: VALID_USER.email, password: 'WrongPass1' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
    expect(res.body.token).toBeUndefined();
  });

  test("IT_06: unknown user -> identical 401 'Invalid credentials' (no account enumeration)", async () => {
    await createUser();
    const wrongPassword = await login({ email: VALID_USER.email, password: 'WrongPass1' });
    const unknownUser = await login({ email: 'ghost@demo.com', password: 'Test@123' });

    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });

  test('UT_04 over HTTP: blank credentials -> 400', async () => {
    const res = await login({ email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ email: 'Email is required', password: 'Password is required' });
  });

  test('UT_05 over HTTP: malformed email -> 400', async () => {
    const res = await login({ email: 'user@@demo', password: 'Test@123' });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBe('Enter a valid email address');
  });

  test('missing body entirely -> 400, not a crash', async () => {
    const res = await request(app).post('/api/auth/login');
    expect(res.status).toBe(400);
  });

  test('NoSQL injection login ({ "$gt": "" }) is blocked', async () => {
    await createUser();
    const res = await login({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  test('a plaintext password in the database can never authenticate a user', async () => {
    await createUser();
    // Bypass the schema validator to simulate a corrupted record.
    await User.collection.updateOne({ email: 'test@demo.com' }, { $set: { password: 'Test@123' } });
    const res = await login({ email: VALID_USER.email, password: 'Test@123' });
    expect(res.status).toBe(401);
  });

  test('server faults return a generic 500 with no stack trace or internals', async () => {
    jest.spyOn(User, 'findOne').mockImplementationOnce(() => {
      throw new Error('boom: mongodb://admin:hunter2@internal-host');
    });
    const res = await login({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toMatch(/boom|hunter2|node_modules|at .*\(/);
  });
});

describe('login throttling', () => {
  test('IT_07: repeated failed logins are throttled with 429', async () => {
    await createUser();
    const throttled = createApp({ rateLimit: { loginLimit: 3 } });

    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      statuses.push((await login({ email: VALID_USER.email, password: 'wrong' }, throttled)).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429, 429]);

    const blocked = await login({ email: VALID_USER.email, password: 'wrong' }, throttled);
    expect(blocked.body.error).toMatch(/too many/i);
  });

  test('successful logins do not count towards the limit', async () => {
    await createUser();
    const throttled = createApp({ rateLimit: { loginLimit: 2 } });

    for (let i = 0; i < 4; i += 1) {
      const res = await login({ email: VALID_USER.email, password: VALID_USER.password }, throttled);
      expect(res.status).toBe(200);
    }
  });
});
