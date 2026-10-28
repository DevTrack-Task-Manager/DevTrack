'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword, comparePassword, getDummyHash } = require('../utils/password');
const { signToken } = require('../utils/token');

const EMAIL_TAKEN = 'Email already registered'; // Test Plan IT_02
const INVALID_CREDENTIALS = 'Invalid credentials'; // Test Plan IT_05 / IT_06 (deliberately generic)

/** POST /api/auth/register (FR-01, SEC-01) */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated;

  // Cheap duplicate check first so we do not burn a bcrypt hash on a known duplicate.
  if (await User.exists({ email })) {
    throw AppError.conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN });
  }

  const hash = await hashPassword(password);

  let user;
  try {
    user = await User.create({ name, email, password: hash });
  } catch (err) {
    // Two simultaneous registrations can both pass the check above; the unique index decides.
    if (err.code === 11000) throw AppError.conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN });
    throw err;
  }

  res.status(201).json({ message: 'Registration successful', user: user.toJSON() });
});

/** POST /api/auth/login (FR-02, FR-03) */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated;

  const user = await User.findOne({ email }).select('+password');

  // Always run one bcrypt comparison, even for unknown emails, so response time
  // does not reveal whether an account exists.
  const hash = user ? user.password : await getDummyHash();
  const matches = await comparePassword(password, hash);

  if (!user || !matches) throw AppError.unauthorized(INVALID_CREDENTIALS);

  const { token, expiresAt } = signToken(user.id);
  res.json({
    message: 'Login successful',
    token,
    tokenType: 'Bearer',
    expiresAt,
    user: user.toJSON(),
  });
});

/** GET /api/auth/me (protected): verifies a token and returns the current user. */
const me = (req, res) => {
  res.json({ user: req.user.toJSON(), session: req.auth });
};

/**
 * POST /api/auth/logout (protected, FR-13)
 * JWTs are stateless, so this does NOT revoke the token. The client discards it.
 * The message is deliberately honest about that (Issue #16 acceptance criteria).
 */
const logout = (_req, res) => {
  res.json({
    message: 'Signed out. The client must discard its token; it is not revoked server side.',
  });
};

module.exports = { register, login, me, logout };
