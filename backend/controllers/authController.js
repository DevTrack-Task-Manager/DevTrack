'use strict';

const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword, comparePassword, getDummyHash } = require('../utils/password');
const { signToken } = require('../utils/token');

const EMAIL_TAKEN = 'Email already registered'; // Test Plan IT_02
const WRONG_PASSWORD = 'Current password is incorrect';
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
 * PUT /api/auth/me (protected): edit name and / or email.
 * Changing the email changes the login identifier, so it needs the current password. A wrong
 * password is a 400, never a 401: a 401 would make the client discard a perfectly good session.
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, currentPassword } = req.validated;
  const changes = {};
  if (name !== undefined && name !== req.user.name) changes.name = name;

  if (email !== undefined && email !== req.user.email) {
    if (currentPassword === undefined) {
      throw AppError.badRequest('Enter your current password to change your email', {
        currentPassword: 'Enter your current password to change your email',
      });
    }
    const account = await User.findById(req.user._id).select('+password');
    if (!(await comparePassword(currentPassword, account.password))) {
      throw AppError.badRequest(WRONG_PASSWORD, { currentPassword: WRONG_PASSWORD });
    }
    if (await User.exists({ email, _id: { $ne: req.user._id } })) {
      throw AppError.conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN });
    }
    changes.email = email;
  }

  if (!Object.keys(changes).length) {
    return res.json({ message: 'No changes', user: req.user.toJSON() });
  }

  let updated;
  try {
    updated = await User.findOneAndUpdate({ _id: req.user._id }, { $set: changes }, { new: true, runValidators: true });
  } catch (err) {
    if (err.code === 11000) throw AppError.conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN });
    throw err;
  }
  return res.json({ message: 'Profile updated', user: updated.toJSON() });
});

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

module.exports = { register, login, me, updateMe, logout };
