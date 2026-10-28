'use strict';

const { hashPassword, comparePassword, isBcryptHash, getHashRounds, getDummyHash, MIN_ROUNDS } = require('../../utils/password');

describe('SEC-01 password hashing', () => {
  test('hash is a bcrypt hash, differs from plaintext, and uses at least 10 rounds', async () => {
    const hash = await hashPassword('Test@123');
    expect(hash).not.toContain('Test@123');
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(getHashRounds(hash)).toBeGreaterThanOrEqual(10);
    expect(isBcryptHash(hash)).toBe(true);
  });

  test('the same password hashes differently each time (random salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('Test@123'), hashPassword('Test@123')]);
    expect(a).not.toBe(b);
  });

  test('comparePassword accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('Test@123');
    await expect(comparePassword('Test@123', hash)).resolves.toBe(true);
    await expect(comparePassword('WrongPass1', hash)).resolves.toBe(false);
  });

  test(`refuses to hash with fewer than ${MIN_ROUNDS} rounds`, () => {
    expect(() => hashPassword('Test@123', 4)).toThrow(/at least 10/);
  });

  test('isBcryptHash rejects plaintext and weak-cost hashes', () => {
    expect(isBcryptHash('Test@123')).toBe(false);
    expect(isBcryptHash('')).toBe(false);
    expect(isBcryptHash(undefined)).toBe(false);
    // well-formed hash with cost 04
    expect(isBcryptHash('$2a$04$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234')).toBe(false);
  });

  test('dummy hash used for timing equalisation is a valid hash and is cached', async () => {
    const first = await getDummyHash();
    expect(isBcryptHash(first)).toBe(true);
    await expect(getDummyHash()).resolves.toBe(first);
  });
});
