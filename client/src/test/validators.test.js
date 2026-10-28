import { describe, expect, it } from 'vitest';
import {
  checkEmail,
  checkNewPassword,
  scorePassword,
  validateLogin,
  validateRegistration,
} from '../utils/validators';

describe('registration validation (FR-01, FR-12)', () => {
  it('UT_01: blank fields report required errors', () => {
    expect(validateRegistration({ name: '', email: '', password: '' })).toEqual({
      name: 'Name is required',
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  it("UT_02: 'abc.com' is not a valid email", () => {
    expect(checkEmail('abc.com')).toBe('Enter a valid email address');
  });

  it("UT_03: '123' is too weak", () => {
    expect(checkNewPassword('123')).toBe('Password too weak (minimum 6 characters)');
  });

  it('accepts valid input', () => {
    expect(validateRegistration({ name: 'Priya S', email: 'priya@demo.com', password: 'Priya@2024' })).toEqual({});
  });

  it('whitespace-only name counts as missing', () => {
    expect(validateRegistration({ name: '   ', email: 'a@b.co', password: 'Test@123' }).name).toBe('Name is required');
  });
});

describe('login validation (FR-02)', () => {
  it('UT_04: blank email and password are rejected', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  it("UT_05: 'user@@demo' is rejected", () => {
    expect(validateLogin({ email: 'user@@demo', password: 'x' }).email).toBe('Enter a valid email address');
  });

  it('does not apply the registration length rule to login', () => {
    expect(validateLogin({ email: 'a@b.co', password: '1' })).toEqual({});
  });
});

describe('scorePassword', () => {
  it.each([
    ['', 0, ''],
    ['abc', 1, 'Too short'],
    ['abcdefg', 1, 'Weak'],
    ['Abcdefg1', 2, 'Fair'],
    ['Abcdefg1!xyz', 3, 'Strong'],
  ])('%p -> level %i (%s)', (password, level, label) => {
    expect(scorePassword(password)).toEqual({ level, label });
  });
});
