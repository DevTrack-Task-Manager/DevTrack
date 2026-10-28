'use strict';

const { loadConfig } = require('../../config/env');

const GOOD = {
  NODE_ENV: 'development',
  DB_URI: 'mongodb://127.0.0.1:27017/devtrack',
  JWT_SECRET: 'f'.repeat(64),
};

describe('environment configuration (Issue #19)', () => {
  test('loads a valid environment with safe defaults', () => {
    const config = loadConfig(GOOD);
    expect(config.port).toBe(5000);
    expect(config.bcryptRounds).toBe(12);
    expect(config.jwt).toMatchObject({ algorithm: 'HS256', expiresIn: '24h' });
    expect(config.clientOrigins).toEqual(['http://localhost:5173']);
  });

  test('fails fast when JWT_SECRET is missing', () => {
    expect(() => loadConfig({ ...GOOD, JWT_SECRET: '' })).toThrow(/JWT_SECRET is required/);
  });

  test('fails when JWT_SECRET is shorter than 256 bits', () => {
    expect(() => loadConfig({ ...GOOD, JWT_SECRET: 'short' })).toThrow(/at least 32 characters/);
  });

  test('fails when JWT_SECRET is the .env.example placeholder', () => {
    expect(() => loadConfig({ ...GOOD, JWT_SECRET: 'replace-with-a-64-char-random-hex-string' })).toThrow(/placeholder/);
  });

  test('requires DB_URI outside of tests', () => {
    expect(() => loadConfig({ ...GOOD, DB_URI: '' })).toThrow(/DB_URI is required/);
    expect(() => loadConfig({ ...GOOD, DB_URI: '', NODE_ENV: 'test' })).not.toThrow();
  });

  test('SEC-01: refuses fewer than 10 bcrypt rounds', () => {
    expect(() => loadConfig({ ...GOOD, BCRYPT_ROUNDS: '8' })).toThrow(/BCRYPT_ROUNDS/);
  });

  test('reports every problem at once', () => {
    expect(() => loadConfig({ NODE_ENV: 'development', PORT: 'abc' })).toThrow(/JWT_SECRET[\s\S]*DB_URI[\s\S]*PORT/);
  });

  test('parses several CORS origins', () => {
    const config = loadConfig({ ...GOOD, CLIENT_ORIGIN: 'http://a.com/, http://b.com' });
    expect(config.clientOrigins).toEqual(['http://a.com', 'http://b.com']);
  });

  test('the exported config is frozen', () => {
    expect(Object.isFrozen(loadConfig(GOOD))).toBe(true);
  });
});
