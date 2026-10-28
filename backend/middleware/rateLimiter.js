'use strict';

const { rateLimit } = require('express-rate-limit');

/**
 * Per-IP limiter returning the standard `{ "error": ... }` body with HTTP 429.
 * Covers Test Plan IT_07 (throttle after repeated failed logins).
 */
function createRateLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, res) => res.status(429).json({ error: message }),
  });
}

/** Only failed logins count towards the limit, so normal users are never locked out. */
const createLoginLimiter = ({ windowMs, loginLimit }) =>
  createRateLimiter({
    windowMs,
    limit: loginLimit,
    skipSuccessfulRequests: true,
    message: 'Too many failed login attempts. Please try again later.',
  });

const createRegisterLimiter = ({ windowMs, registerLimit }) =>
  createRateLimiter({
    windowMs,
    limit: registerLimit,
    message: 'Too many registration attempts. Please try again later.',
  });

module.exports = { createRateLimiter, createLoginLimiter, createRegisterLimiter };
