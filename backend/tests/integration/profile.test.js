'use strict';

const request = require('supertest');
const User = require('../../models/User');
const { createApp } = require('../../server');
const { connectTestDb, clearTestDb, closeTestDb } = require('../helpers/db');
const { loginAs, createUser } = require('../helpers/factories');

const app = createApp();

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const put = (token, body) => request(app).put('/api/auth/me').set('Authorization', `Bearer ${token}`).send(body);

describe('PUT /api/auth/me: edit user details', () => {
  test('requires a token', async () => {
    const res = await request(app).put('/api/auth/me').send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  test('changes the name without needing a password', async () => {
    const { token, user } = await loginAs(app);
    const res = await put(token, { name: '  Priya   Sharma ' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Profile updated');
    expect(res.body.user).toMatchObject({ id: user.id, name: 'Priya Sharma', email: 'test@demo.com' });
    expect((await User.findById(user.id)).name).toBe('Priya Sharma');
  });

  test('never returns or exposes the password hash', async () => {
    const { token } = await loginAs(app);
    const res = await put(token, { name: 'New Name' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/i);
  });

  test('changes the email when the current password is right, and the old login stops working', async () => {
    const { token, user, res: loginRes } = await loginAs(app);
    expect(loginRes.status).toBe(200);
    const res = await put(token, { email: 'New.Address@Demo.com', currentPassword: 'Test@123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('new.address@demo.com');
    expect((await User.findById(user.id)).email).toBe('new.address@demo.com');

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'test@demo.com', password: 'Test@123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'new.address@demo.com', password: 'Test@123' });
    expect(newLogin.status).toBe(200);
  });

  test('the same token keeps working after the email changes (the token carries the id, not the email)', async () => {
    const { token } = await loginAs(app);
    await put(token, { email: 'moved@demo.com', currentPassword: 'Test@123' });
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('moved@demo.com');
  });

  test('an email change without the current password is a 400 and changes nothing', async () => {
    const { token, user } = await loginAs(app);
    const res = await put(token, { email: 'new@demo.com' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('currentPassword');
    expect((await User.findById(user.id)).email).toBe('test@demo.com');
  });

  test('a wrong current password is a 400 (not 401, which would sign the user out) and changes nothing', async () => {
    const { token, user } = await loginAs(app);
    const res = await put(token, { name: 'Sneaky', email: 'new@demo.com', currentPassword: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Current password is incorrect');
    const stored = await User.findById(user.id);
    expect(stored.email).toBe('test@demo.com');
    expect(stored.name).toBe('Test User');
  });

  test('an email that belongs to someone else is a 409 and changes nothing', async () => {
    const { token, user } = await loginAs(app);
    await createUser({ email: 'taken@demo.com' });
    const res = await put(token, { email: 'taken@demo.com', currentPassword: 'Test@123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
    expect((await User.findById(user.id)).email).toBe('test@demo.com');
  });

  test('sending your own current email is a harmless no-op (no password needed)', async () => {
    const { token } = await loginAs(app);
    const res = await put(token, { name: 'Test User', email: 'TEST@demo.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('No changes');
  });

  test.each([
    [{}, 'Provide at least one field to update'],
    [{ name: '' }, 'Name is required'],
    [{ name: 'x'.repeat(61) }, 'Name must be at most 60 characters'],
    [{ email: 'not-an-email' }, 'Enter a valid email address'],
    [{ email: { $gt: '' } }, 'Enter a valid email address'],
    [{ name: { $ne: null } }, 'Name must be text'],
  ])('%j -> 400 %s', async (body, message) => {
    const { token } = await loginAs(app);
    const res = await put(token, body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  test('only name and email can be changed: role, password and id in the body are ignored', async () => {
    const { token, user } = await loginAs(app);
    const before = await User.findById(user.id).select('+password');
    const res = await put(token, { name: 'Only This', password: 'Hacked1!', _id: 'ffffffffffffffffffffffff', isAdmin: true });
    expect(res.status).toBe(200);
    const after = await User.findById(user.id).select('+password');
    expect(after.password).toBe(before.password);
    expect(after.id).toBe(user.id);
    expect(after.toObject()).not.toHaveProperty('isAdmin');
  });

  test("one user cannot edit another's details: the token decides who is edited", async () => {
    const a = await loginAs(app, { email: 'a@demo.com' });
    const { user: b } = await createUser({ email: 'b@demo.com', name: 'Bee' });
    const res = await put(a.token, { name: 'Renamed', id: b.id, _id: b.id });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(a.user.id);
    expect((await User.findById(b.id)).name).toBe('Bee');
  });
});
