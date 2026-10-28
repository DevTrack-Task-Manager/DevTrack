'use strict';

const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('../../utils/token');
const { signRaw } = require('../helpers/factories');

const USER_ID = '65f1a2b3c4d5e6f7a8b9c0d1';

describe('FR-03 / SEC-02 JWT generation', () => {
  test('UT_06: signToken returns a signed three-part JWT', () => {
    const { token } = signToken(USER_ID);
    expect(token.split('.')).toHaveLength(3);
    expect(jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })).toBeDefined();
  });

  test('UT_07: token carries userId and an expiry, and no password data', () => {
    const { token } = signToken(USER_ID);
    const payload = jwt.decode(token);
    expect(payload.userId).toBe(USER_ID);
    expect(typeof payload.exp).toBe('number');
    expect(JSON.stringify(payload)).not.toMatch(/password|hash/i);
  });

  test('SEC-02: uses HS256 and expires exactly 24 hours after issuance', () => {
    const { token, expiresAt } = signToken(USER_ID);
    const { header, payload } = jwt.decode(token, { complete: true });
    expect(header.alg).toBe('HS256');
    expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
    expect(new Date(expiresAt).getTime()).toBe(payload.exp * 1000);
  });

  test('the signing secret is at least 256 bits', () => {
    expect(Buffer.byteLength(process.env.JWT_SECRET, 'utf8')).toBeGreaterThanOrEqual(32);
  });
});

describe('verifyToken', () => {
  test('accepts a freshly issued token', () => {
    const { token } = signToken(USER_ID);
    expect(verifyToken(token).userId).toBe(USER_ID);
  });

  test('IT_09 (unit level): expired token -> 401 Token expired', () => {
    const token = signRaw({ userId: USER_ID }, { expiresIn: -60 });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401, message: 'Token expired' }));
  });

  test('IT_11 (unit level): tampered payload -> 401 Invalid token', () => {
    const { token } = signToken(USER_ID);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ userId: 'aaaaaaaaaaaaaaaaaaaaaaaa', exp: 9999999999, iss: 'devtrack-api' }))
      .toString('base64url');
    expect(() => verifyToken(`${header}.${forged}.${signature}`)).toThrow(
      expect.objectContaining({ statusCode: 401, message: 'Invalid token' })
    );
  });

  test('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ userId: USER_ID }, 'another-secret-another-secret-another-secret', {
      algorithm: 'HS256',
      issuer: 'devtrack-api',
      expiresIn: '1h',
    });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  test('rejects an unsigned (alg: none) token', () => {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ userId: USER_ID, exp: 9999999999 })}.`;
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401, message: 'Invalid token' }));
  });

  test('rejects a different HMAC algorithm (HS512) even with the right secret', () => {
    const token = jwt.sign({ userId: USER_ID }, process.env.JWT_SECRET, {
      algorithm: 'HS512',
      issuer: 'devtrack-api',
      expiresIn: '1h',
    });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  test('rejects a wrong issuer', () => {
    const token = signRaw({ userId: USER_ID }, { issuer: 'someone-else', expiresIn: '1h' });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  test('rejects a valid signature whose userId is not an ObjectId', () => {
    const token = signRaw({ userId: { $ne: null } }, { expiresIn: '1h' });
    expect(() => verifyToken(token)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  test.each(['', 'abc', 'a.b.c', 'Bearer x'])('rejects garbage %p', (garbage) => {
    expect(() => verifyToken(garbage)).toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});
