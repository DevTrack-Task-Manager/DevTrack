'use strict';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const User = require('../../models/User');
const { hashPassword } = require('../../utils/password');

const VALID_USER = Object.freeze({ name: 'Test User', email: 'test@demo.com', password: 'Test@123' });

/** Inserts a user directly (bypassing the API) with a properly hashed password. */
async function createUser(overrides = {}) {
  const data = { ...VALID_USER, ...overrides };
  const user = await User.create({ ...data, password: await hashPassword(data.password) });
  return { user, password: data.password };
}

/** Registers + logs in through the real API and returns the token. */
async function loginAs(app, overrides = {}) {
  const { user, password } = await createUser(overrides);
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password });
  return { token: res.body.token, user, res };
}

/** Signs a token with the real secret but an arbitrary payload / options. */
function signRaw(payload, options = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', issuer: 'devtrack-api', ...options });
}

module.exports = { VALID_USER, createUser, loginAs, signRaw };
