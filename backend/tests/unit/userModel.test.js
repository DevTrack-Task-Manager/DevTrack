'use strict';

const User = require('../../models/User');
const { hashPassword } = require('../../utils/password');

describe('User schema (TDD 3.1)', () => {
  let validHash;
  beforeAll(async () => {
    validHash = await hashPassword('Test@123');
  });

  test('requires name, email and password', () => {
    const err = new User({}).validateSync();
    expect(Object.keys(err.errors).sort()).toEqual(['email', 'name', 'password']);
  });

  test('accepts a valid user and normalises email', () => {
    const user = new User({ name: ' Test User ', email: ' TEST@Demo.com ', password: validHash });
    expect(user.validateSync()).toBeUndefined();
    expect(user.email).toBe('test@demo.com');
    expect(user.name).toBe('Test User');
  });

  test('rejects an invalid email', () => {
    const err = new User({ name: 'A', email: 'abc.com', password: validHash }).validateSync();
    expect(err.errors.email.message).toBe('Enter a valid email address');
  });

  test('SEC-01: refuses to persist a plaintext password', () => {
    const err = new User({ name: 'A', email: 'a@b.co', password: 'Test@123' }).validateSync();
    expect(err.errors.password).toBeDefined();
  });

  test('SEC-01: refuses a bcrypt hash with fewer than 10 rounds', () => {
    const weak = '$2a$04$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
    const err = new User({ name: 'A', email: 'a@b.co', password: weak }).validateSync();
    expect(err.errors.password).toBeDefined();
  });

  test('password field is excluded from queries by default', () => {
    expect(User.schema.path('password').options.select).toBe(false);
  });

  test('email has a unique index', () => {
    expect(User.schema.path('email').options.unique).toBe(true);
  });

  test('toJSON never exposes the password hash, __v or _id', () => {
    const json = new User({ name: 'A', email: 'a@b.co', password: validHash }).toJSON();
    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');
    expect(json.id).toMatch(/^[a-f\d]{24}$/);
  });

  test('has timestamps enabled', () => {
    expect(User.schema.options.timestamps).toBe(true);
  });
});
