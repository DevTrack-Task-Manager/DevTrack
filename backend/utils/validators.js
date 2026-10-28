'use strict';

/**
 * Pure, dependency-free input validators and sanitisers.
 * Messages match the Test Plan (UT_01-UT_05, IT_02, IT_05, IT_06) word for word.
 * Every validator rejects non-string input, which also blocks NoSQL operator
 * injection such as { "email": { "$gt": "" } }.
 */

const NAME_MAX = 60;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 6; // Test Plan UT_03: "Password too weak (min 6 chars)"
const PASSWORD_MAX_BYTES = 72; // bcrypt silently truncates beyond 72 bytes

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Trims, strips control characters and collapses runs of whitespace. */
function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return value;
  return value.replace(CONTROL_CHARS, '').trim().toLowerCase();
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  if (value.length > EMAIL_MAX) return false;
  const [local] = value.split('@');
  if (local.length > 64) return false;
  return EMAIL_PATTERN.test(value);
}

function checkName(raw) {
  if (raw === undefined || raw === null || raw === '') return { error: 'Name is required' };
  if (typeof raw !== 'string') return { error: 'Name must be text' };
  const value = sanitizeText(raw);
  if (!value) return { error: 'Name is required' };
  if (value.length > NAME_MAX) return { error: `Name must be at most ${NAME_MAX} characters` };
  return { value };
}

function checkEmail(raw) {
  if (raw === undefined || raw === null) return { error: 'Email is required' };
  if (typeof raw !== 'string') return { error: 'Enter a valid email address' };
  const value = normalizeEmail(raw);
  if (!value) return { error: 'Email is required' };
  if (!isValidEmail(value)) return { error: 'Enter a valid email address' };
  return { value };
}

function checkNewPassword(raw) {
  if (raw === undefined || raw === null || raw === '') return { error: 'Password is required' };
  if (typeof raw !== 'string') return { error: 'Password must be text' };
  if (raw.length < PASSWORD_MIN) return { error: `Password too weak (minimum ${PASSWORD_MIN} characters)` };
  if (Buffer.byteLength(raw, 'utf8') > PASSWORD_MAX_BYTES) {
    return { error: `Password is too long (maximum ${PASSWORD_MAX_BYTES} bytes)` };
  }
  return { value: raw }; // passwords are never trimmed or altered
}

function checkExistingPassword(raw) {
  if (raw === undefined || raw === null || raw === '') return { error: 'Password is required' };
  if (typeof raw !== 'string') return { error: 'Password must be text' };
  if (Buffer.byteLength(raw, 'utf8') > PASSWORD_MAX_BYTES) return { error: 'Invalid credentials' };
  return { value: raw };
}

function runChecks(body, checks) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const value = {};
  const errors = {};
  for (const [field, check] of Object.entries(checks)) {
    const result = check(source[field]);
    if (result.error) errors[field] = result.error;
    else value[field] = result.value;
  }
  return { value, errors };
}

/** FR-01 */
function validateRegistration(body) {
  return runChecks(body, { name: checkName, email: checkEmail, password: checkNewPassword });
}

/** FR-02 */
function validateLogin(body) {
  return runChecks(body, { email: checkEmail, password: checkExistingPassword });
}

/** Returns the first error message in the object's insertion order. */
function firstError(errors) {
  return Object.values(errors)[0];
}

module.exports = {
  NAME_MAX,
  EMAIL_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX_BYTES,
  sanitizeText,
  normalizeEmail,
  isValidEmail,
  validateRegistration,
  validateLogin,
  firstError,
};
