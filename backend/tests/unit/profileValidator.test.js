'use strict';

const { validateProfileUpdate } = require('../../utils/validators');

describe('validateProfileUpdate', () => {
  test('accepts a name alone, an email alone, or both', () => {
    expect(validateProfileUpdate({ name: '  Priya   S ' })).toEqual({ value: { name: 'Priya S' }, errors: {} });
    expect(validateProfileUpdate({ email: ' New@Demo.COM ' })).toEqual({ value: { email: 'new@demo.com' }, errors: {} });
    expect(validateProfileUpdate({ name: 'A', email: 'a@b.co' }).errors).toEqual({});
  });

  test('keeps currentPassword untouched (never trimmed)', () => {
    expect(validateProfileUpdate({ email: 'a@b.co', currentPassword: ' pw ' }).value.currentPassword).toBe(' pw ');
  });

  test.each([undefined, null, {}, [], 'text', 7, { unknown: 1 }, { currentPassword: 'x' }])(
    'rejects %p: nothing to update',
    (body) => {
      expect(validateProfileUpdate(body).errors).toEqual({ body: 'Provide at least one field to update' });
    }
  );

  test.each([
    [{ name: '' }, 'name', 'Name is required'],
    [{ name: '   ' }, 'name', 'Name is required'],
    [{ name: null }, 'name', 'Name is required'],
    [{ name: 42 }, 'name', 'Name must be text'],
    [{ name: 'x'.repeat(61) }, 'name', 'Name must be at most 60 characters'],
    [{ email: '' }, 'email', 'Email is required'],
    [{ email: 'abc.com' }, 'email', 'Enter a valid email address'],
    [{ email: { $gt: '' } }, 'email', 'Enter a valid email address'],
    [{ email: 'a@b.co', currentPassword: '' }, 'currentPassword', 'Password is required'],
    [{ email: 'a@b.co', currentPassword: { $ne: 1 } }, 'currentPassword', 'Password must be text'],
  ])('%j -> %s: %s', (body, field, message) => {
    expect(validateProfileUpdate(body).errors[field]).toBe(message);
  });

  test('unknown fields (role, password, id) are dropped', () => {
    const { value } = validateProfileUpdate({ name: 'A', role: 'admin', password: 'x', id: '1', _id: '1' });
    expect(Object.keys(value)).toEqual(['name']);
  });
});
