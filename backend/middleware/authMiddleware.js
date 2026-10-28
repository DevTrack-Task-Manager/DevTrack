'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

/**
 * Protects a route (FR-03, SEC-02).
 *  - expects `Authorization: Bearer <jwt>`
 *  - 401 for missing, malformed, tampered, wrong-algorithm or expired tokens
 *  - loads the user so deleted accounts lose access immediately
 *  - sets `req.user` (a User document, so `req.user.id` is the string id from the TDD)
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header) throw AppError.unauthorized('Authentication required');

  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw AppError.unauthorized('Invalid token');
  }

  const payload = verifyToken(parts[1]);
  const user = await User.findById(payload.userId);
  if (!user) throw AppError.unauthorized('Invalid token');

  req.user = user;
  req.auth = { expiresAt: new Date(payload.exp * 1000).toISOString() };
  next();
});

module.exports = { authenticate };
