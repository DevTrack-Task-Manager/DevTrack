'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('./AppError');

const { secret, algorithm, expiresIn, issuer } = config.jwt;
const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Signs a 24 hour HS256 JWT carrying only the user id (never any password data).
 * @returns {{ token: string, expiresAt: string }} expiresAt is ISO 8601
 */
function signToken(userId) {
  const token = jwt.sign({ userId: String(userId) }, secret, { algorithm, expiresIn, issuer });
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * Verifies signature, algorithm, issuer and expiry.
 * Throws AppError(401) with 'Token expired' or 'Invalid token' (Test Plan IT_09, IT_11).
 */
function verifyToken(token) {
  let payload;
  try {
    // `algorithms` is pinned so "alg: none" and algorithm-confusion tokens are refused.
    payload = jwt.verify(token, secret, { algorithms: [algorithm], issuer });
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw AppError.unauthorized('Token expired');
    throw AppError.unauthorized('Invalid token');
  }
  if (!payload || typeof payload.userId !== 'string' || !OBJECT_ID.test(payload.userId)) {
    throw AppError.unauthorized('Invalid token');
  }
  return payload;
}

module.exports = { signToken, verifyToken };
