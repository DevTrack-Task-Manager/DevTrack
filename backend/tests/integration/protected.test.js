'use strict';

const request = require('supertest');
const User = require('../../models/User');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { loginAs, signRaw } = require('../helpers/factories');

// GET /api/tasks arrives with Issue #4. Until then the protected `/api/auth/me` route stands in
// for it: the middleware under test is identical, so IT_08-IT_11 apply unchanged.
const PROTECTED = '/api/auth/me';
const app = createApp();
const get = (token) => {
  const req = request(app).get(PROTECTED);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe('JWT authentication middleware (FR-03, SEC-02, Issue #3)', () => {
  test('IT_08: no Authorization header -> 401', async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  test("IT_09: expired token -> 401 'Token expired'", async () => {
    const { user } = await loginAs(app);
    const expired = signRaw({ userId: user.id }, { expiresIn: -10 });
    const res = await get(expired);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token expired' });
  });

  test('IT_10: valid token -> 200 and the authenticated user', async () => {
    const { token, user } = await loginAs(app);
    const res = await get(token);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: 'test@demo.com', name: 'Test User' });
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.session.expiresAt).toBeDefined();
  });

  test("IT_11: tampered payload -> 401 'Invalid token'", async () => {
    const { token } = await loginAs(app);
    const [header, , signature] = token.split('.');
    const payload = Buffer.from(
      JSON.stringify({ userId: 'ffffffffffffffffffffffff', exp: 9999999999, iss: 'devtrack-api' })
    ).toString('base64url');

    const res = await get(`${header}.${payload}.${signature}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
  });

  test("IT_11: tampered signature -> 401 'Invalid token'", async () => {
    const { token } = await loginAs(app);
    const [header, payload, signature] = token.split('.');
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);

    const res = await get(`${header}.${payload}.${flipped}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  test('unsigned alg:none token is refused', async () => {
    const { user } = await loginAs(app);
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ userId: user.id, exp: 9999999999 })}.`;
    expect((await get(forged)).status).toBe(401);
  });

  test('token signed with the wrong secret is refused', async () => {
    const { user } = await loginAs(app);
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ userId: user.id }, 'x'.repeat(64), { issuer: 'devtrack-api', expiresIn: '1h' });
    expect((await get(forged)).status).toBe(401);
  });

  test.each([
    ['no scheme', (t) => t],
    ['Basic scheme', (t) => `Basic ${t}`],
    ['extra segments', (t) => `Bearer ${t} extra`],
  ])('malformed header (%s) -> 401', async (_label, build) => {
    const { token } = await loginAs(app);
    const res = await request(app).get(PROTECTED).set('Authorization', build(token));
    expect(res.status).toBe(401);
  });

  test('the Bearer scheme is case-insensitive', async () => {
    const { token } = await loginAs(app);
    const res = await request(app).get(PROTECTED).set('Authorization', `bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('a valid token for a deleted account is refused immediately', async () => {
    const { token, user } = await loginAs(app);
    await User.deleteOne({ _id: user._id });
    const res = await get(token);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  test('error responses never echo the token or secret', async () => {
    const res = await get('not.a.token');
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('not.a.token');
    expect(raw).not.toContain(process.env.JWT_SECRET);
  });
});

describe('POST /api/auth/logout (FR-13)', () => {
  test('requires authentication', async () => {
    expect((await request(app).post('/api/auth/logout')).status).toBe(401);
  });

  test('succeeds with a valid token and does not claim the token was revoked', async () => {
    const { token } = await loginAs(app);
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/not revoked/i);
    // Stateless JWT: still technically valid until expiry. We say so honestly rather than pretend.
    expect((await get(token)).status).toBe(200);
  });
});
