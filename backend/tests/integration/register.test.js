'use strict';

const request = require('supertest');
const User = require('../../models/User');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { VALID_USER, createUser } = require('../helpers/factories');
const { getHashRounds } = require('../../utils/password');

const app = createApp();
const register = (body) => request(app).post('/api/auth/register').send(body);

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe('POST /api/auth/register (FR-01, SEC-01)', () => {
  test('IT_01: valid data creates the user and returns a safe 201 response', async () => {
    const res = await register(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registration successful');
    expect(res.body.user).toMatchObject({ name: 'Test User', email: 'test@demo.com' });
    expect(res.body.user.id).toMatch(/^[a-f\d]{24}$/);
    expect(await User.countDocuments()).toBe(1);
  });

  test('IT_01: the response never contains the password or its hash', async () => {
    const res = await register(VALID_USER);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('Test@123');
    expect(raw).not.toMatch(/\$2[aby]\$/);
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('IT_02: duplicate email is rejected with 409 and no second row is created', async () => {
    await register(VALID_USER);
    const res = await register({ ...VALID_USER, name: 'Someone Else' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
    expect(res.body.fields).toEqual({ email: 'Email already registered' });
    expect(await User.countDocuments({ email: 'test@demo.com' })).toBe(1);
  });

  test('IT_02: duplicate detection is case- and whitespace-insensitive', async () => {
    await register(VALID_USER);
    const res = await register({ ...VALID_USER, email: '  TEST@Demo.com ' });
    expect(res.status).toBe(409);
  });

  test('IT_02: two simultaneous registrations create exactly one account', async () => {
    const results = await Promise.all([register(VALID_USER), register(VALID_USER)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await User.countDocuments()).toBe(1);
  });

  test('IT_03 / SEC-01: stored password is a bcrypt hash (>= 10 rounds), not plaintext', async () => {
    await register(VALID_USER);
    const stored = await User.findOne({ email: 'test@demo.com' }).select('+password').lean();

    expect(stored.password).not.toBe('Test@123');
    expect(stored.password).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(getHashRounds(stored.password)).toBeGreaterThanOrEqual(10);
  });

  test('UT_01 over HTTP: empty fields -> 400 with a message per field', async () => {
    const res = await register({ name: '', email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
    expect(res.body.fields).toEqual({
      name: 'Name is required',
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  test('UT_02 over HTTP: invalid email -> 400', async () => {
    const res = await register({ ...VALID_USER, email: 'abc.com' });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toBe('Enter a valid email address');
  });

  test('UT_03 over HTTP: weak password -> 400', async () => {
    const res = await register({ ...VALID_USER, password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBe('Password too weak (minimum 6 characters)');
    expect(await User.countDocuments()).toBe(0);
  });

  test('NoSQL operator payloads are rejected with 400, not executed', async () => {
    const res = await register({ name: 'x', email: { $gt: '' }, password: 'Test@123' });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  test('unknown fields cannot be mass-assigned onto the user', async () => {
    const res = await register({ ...VALID_USER, role: 'admin', _id: '000000000000000000000001' });
    expect(res.status).toBe(201);
    const stored = await User.findOne({ email: 'test@demo.com' }).lean();
    expect(stored.role).toBeUndefined();
    expect(String(stored._id)).not.toBe('000000000000000000000001');
  });

  test('an existing user created elsewhere still blocks registration', async () => {
    await createUser();
    expect((await register(VALID_USER)).status).toBe(409);
  });
});
