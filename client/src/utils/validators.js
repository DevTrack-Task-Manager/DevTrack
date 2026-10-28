/**
 * Client-side validation. Messages mirror the server (backend/utils/validators.js) and the
 * Test Plan (UT_01 to UT_05) so the same text appears whichever side catches the problem.
 * The server stays the source of truth; this only gives instant inline feedback (FR-12).
 */
export const NAME_MAX = 60;
export const PASSWORD_MIN = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkName(value = '') {
  const name = value.trim();
  if (!name) return 'Name is required';
  if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`;
  return '';
}

export function checkEmail(value = '') {
  const email = value.trim();
  if (!email) return 'Email is required';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address';
  return '';
}

/** Registration rule: required + minimum length. */
export function checkNewPassword(value = '') {
  if (!value) return 'Password is required';
  if (value.length < PASSWORD_MIN) return `Password too weak (minimum ${PASSWORD_MIN} characters)`;
  return '';
}

/** Login rule: only required. Length rules must not leak the password policy to attackers. */
export function checkExistingPassword(value = '') {
  return value ? '' : 'Password is required';
}

const compact = (errors) => Object.fromEntries(Object.entries(errors).filter(([, message]) => message));

export function validateRegistration({ name, email, password }) {
  return compact({ name: checkName(name), email: checkEmail(email), password: checkNewPassword(password) });
}

export function validateLogin({ email, password }) {
  return compact({ email: checkEmail(email), password: checkExistingPassword(password) });
}

/**
 * Rough strength score for the meter (display only, never blocks submission beyond the minimum).
 * @returns {{ level: 0|1|2|3, label: string }}
 */
export function scorePassword(password = '') {
  if (!password) return { level: 0, label: '' };
  if (password.length < PASSWORD_MIN) return { level: 1, label: 'Too short' };
  let points = 0;
  if (password.length >= 10) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;
  if (points <= 1) return { level: 1, label: 'Weak' };
  if (points <= 3) return { level: 2, label: 'Fair' };
  return { level: 3, label: 'Strong' };
}
