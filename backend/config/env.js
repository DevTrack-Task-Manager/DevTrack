'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Real environment variables always win over the .env file.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MIN_BCRYPT_ROUNDS = 10; // SEC-01
const MAX_BCRYPT_ROUNDS = 15;
const MIN_JWT_SECRET_LENGTH = 32; // 32 chars = 256 bits when random hex/base64 (SEC-02)
const PLACEHOLDER_SECRET = /replace-with|change-?me|your[-_ ]?secret|^<.*>$/i;

function readInt(env, name, fallback, errors, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${name} must be an integer between ${min} and ${max}`);
    return fallback;
  }
  return value;
}

/**
 * Validates and normalises environment variables.
 * Throws one error listing every problem so misconfiguration is obvious at boot.
 * Pure function (takes `env`) so it can be unit tested.
 */
function loadConfig(env = process.env) {
  const errors = [];
  const nodeEnv = env.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';
  const isProd = nodeEnv === 'production';

  const jwtSecret = env.JWT_SECRET || '';
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (256 bits). Run: npm run gen:secret`
    );
  } else if (PLACEHOLDER_SECRET.test(jwtSecret)) {
    errors.push('JWT_SECRET still contains the placeholder from .env.example. Run: npm run gen:secret');
  }

  const dbUri = env.DB_URI || '';
  if (!dbUri && !isTest) errors.push('DB_URI is required');

  const port = readInt(env, 'PORT', 5000, errors, { min: 1, max: 65535 });
  const bcryptRounds = readInt(env, 'BCRYPT_ROUNDS', 12, errors, {
    min: MIN_BCRYPT_ROUNDS,
    max: MAX_BCRYPT_ROUNDS,
  });
  const windowMinutes = readInt(env, 'RATE_LIMIT_WINDOW_MINUTES', 15, errors, { min: 1, max: 1440 });
  // Failed logins per window per IP. Generous under test so suites never trip it by accident.
  const loginLimit = readInt(env, 'LOGIN_RATE_LIMIT', isTest ? 1000 : 10, errors, { min: 1 });
  const registerLimit = readInt(env, 'REGISTER_RATE_LIMIT', isTest ? 1000 : 20, errors, { min: 1 });
  const dbMaxRetries = readInt(env, 'DB_MAX_RETRIES', 5, errors, { min: 0, max: 20 });
  const dbRetryDelay = readInt(env, 'DB_RETRY_DELAY_MS', 1000, errors, { min: 10 });

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }

  const clientOrigins = (env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return Object.freeze({
    nodeEnv,
    isTest,
    isProd,
    port,
    dbUri,
    clientOrigins,
    trustProxy: env.TRUST_PROXY === 'true' ? 1 : false,
    bcryptRounds,
    jwt: Object.freeze({
      secret: jwtSecret,
      algorithm: 'HS256', // fixed on purpose: never configurable, never "none"
      expiresIn: '24h', // SEC-02: fixed 24 hour lifetime
      issuer: 'devtrack-api',
    }),
    rateLimit: Object.freeze({
      windowMs: windowMinutes * 60 * 1000,
      loginLimit,
      registerLimit,
    }),
    db: Object.freeze({ maxRetries: dbMaxRetries, retryBaseDelayMs: dbRetryDelay }),
  });
}

const config = loadConfig();

module.exports = Object.freeze({
  ...config,
  loadConfig,
  MIN_BCRYPT_ROUNDS,
  MIN_JWT_SECRET_LENGTH,
});
