'use strict';

const {
  validateRegistration,
  validateLogin,
  sanitizeText,
  isValidEmail,
  PASSWORD_MAX_BYTES,
} = require('../../utils/validators');

describe('FR-01 registration validation', () => {
  test('UT_01: blank name, email and password are all reported as required', () => {
    const { errors } = validateRegistration({ name: '', email: '', password: '' });
    expect(errors).toEqual({
      name: 'Name is required',
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  test('UT_01: a missing or non-object body is treated as empty', () => {
    for (const body of [undefined, null, 'text', 42, []]) {
      const { errors } = validateRegistration(body);
      expect(Object.keys(errors)).toEqual(['name', 'email', 'password']);
    }
  });

  test("UT_02: email 'abc.com' is rejected with 'Enter a valid email address'", () => {
    const { errors } = validateRegistration({ name: 'A', email: 'abc.com', password: 'Test@123' });
    expect(errors.email).toBe('Enter a valid email address');
  });

  test("UT_03: password '123' is rejected as too weak (minimum 6 characters)", () => {
    const { errors } = validateRegistration({ name: 'A', email: 'a@b.co', password: '123' });
    expect(errors.password).toBe('Password too weak (minimum 6 characters)');
  });

  test('accepts valid data and returns sanitised values', () => {
    const { value, errors } = validateRegistration({
      name: '  Priya   S  ',
      email: '  Priya@Demo.COM ',
      password: 'Priya@2024',
    });
    expect(errors).toEqual({});
    expect(value).toEqual({ name: 'Priya S', email: 'priya@demo.com', password: 'Priya@2024' });
  });

  test('does not alter the password (no trimming)', () => {
    const { value } = validateRegistration({ name: 'A', email: 'a@b.co', password: '  spaced pass  ' });
    expect(value.password).toBe('  spaced pass  ');
  });

  test('rejects passwords longer than bcrypt can use (72 bytes)', () => {
    const { errors } = validateRegistration({
      name: 'A',
      email: 'a@b.co',
      password: 'x'.repeat(PASSWORD_MAX_BYTES + 1),
    });
    expect(errors.password).toMatch(/too long/i);
  });

  test('rejects over-long names', () => {
    const { errors } = validateRegistration({ name: 'n'.repeat(61), email: 'a@b.co', password: 'Test@123' });
    expect(errors.name).toMatch(/at most 60/);
  });

  test('NoSQL operator objects and arrays are rejected, never passed through', () => {
    const { errors } = validateRegistration({
      name: { $ne: null },
      email: { $gt: '' },
      password: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(errors.name).toBeDefined();
    expect(errors.email).toBe('Enter a valid email address');
    expect(errors.password).toBeDefined();
  });

  test('control characters are stripped from names', () => {
    expect(sanitizeText('A\u0000b\u0007c\nd')).toBe('A b c d');
  });
});

describe('FR-02 login validation', () => {
  test('UT_04: empty email and password are rejected', () => {
    const { errors } = validateLogin({ email: '', password: '' });
    expect(errors).toEqual({ email: 'Email is required', password: 'Password is required' });
  });

  test("UT_05: malformed email 'user@@demo' is rejected", () => {
    const { errors } = validateLogin({ email: 'user@@demo', password: 'Test@123' });
    expect(errors.email).toBe('Enter a valid email address');
  });

  test('does not enforce the registration password length on login', () => {
    const { errors } = validateLogin({ email: 'a@b.co', password: '1' });
    expect(errors).toEqual({});
  });

  test('operator injection in login email is rejected', () => {
    const { errors } = validateLogin({ email: { $gt: '' }, password: { $gt: '' } });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe('isValidEmail', () => {
  test.each(['a@b.co', 'first.last+tag@sub.example.org'])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  test.each(['', 'abc.com', 'user@@demo', 'a@b', 'a b@c.com', '@x.com', null, 5])('rejects %p', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
