'use strict';

const { sanitizeText } = require('./validators');
const { TASK_STATUSES, TASK_PRIORITIES, TITLE_MAX, DESCRIPTION_MAX } = require('../models/Task');

/**
 * Pure validators for task payloads (TDD 3.2, FR-04, FR-06, FR-08, FR-09). Same contract as
 * utils/validators.js: `(body) => ({ value, errors })`, used through middleware/validate.js.
 *
 * Only whitelisted fields ever reach `value`. `userId`, `_id`, `createdAt` and anything else a
 * client sends are dropped, so ownership can never be set or changed from the request body.
 * Non-string input is rejected for every text field, which also blocks NoSQL operator
 * injection such as { "title": { "$ne": null } }.
 */

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_KEEP_NEWLINES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<\/?[a-z!][^>]*>/gi;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Plain-text description: normalises line endings, removes control characters and strips
 * HTML tags. Newlines are kept. React escapes output anyway; this keeps markup out of storage.
 */
function sanitizeDescription(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_KEEP_NEWLINES, '')
    .replace(HTML_TAGS, '')
    .trim();
}

const isMissing = (raw) => raw === undefined || raw === null || raw === '';

function checkTitle(raw) {
  if (isMissing(raw)) return { error: 'Title is required' };
  if (typeof raw !== 'string') return { error: 'Title must be text' };
  const value = sanitizeText(raw);
  if (!value) return { error: 'Title is required' };
  if (value.length > TITLE_MAX) return { error: `Title must be at most ${TITLE_MAX} characters` };
  return { value };
}

function checkDescription(raw) {
  if (raw === undefined || raw === null) return { value: '' };
  if (typeof raw !== 'string') return { error: 'Description must be text' };
  const value = sanitizeDescription(raw);
  if (value.length > DESCRIPTION_MAX) {
    return { error: `Description must be at most ${DESCRIPTION_MAX} characters` };
  }
  return { value };
}

function checkStatus(raw) {
  if (typeof raw !== 'string' || !TASK_STATUSES.includes(raw)) {
    return { error: 'Status must be Pending, In Progress or Completed' };
  }
  return { value: raw };
}

function checkPriority(raw) {
  if (typeof raw !== 'string' || !TASK_PRIORITIES.includes(raw)) {
    return { error: 'Priority must be Low, Medium or High' };
  }
  return { value: raw };
}

/** Accepts 'YYYY-MM-DD' (what <input type="date"> sends) or an ISO 8601 date-time. null or '' clears it. */
function checkDueDate(raw) {
  if (isMissing(raw)) return { value: null };
  const invalid = { error: 'Due date must be a valid date' };
  if (typeof raw !== 'string') return invalid;
  const text = raw.trim();
  if (!DATE_ONLY.test(text) && !ISO_DATE_TIME.test(text)) return invalid;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return invalid;
  // Rejects dates that JavaScript silently rolls over, e.g. 2026-02-31 becoming 2026-03-03.
  if (DATE_ONLY.test(text) && date.toISOString().slice(0, 10) !== text) return invalid;
  return { value: date };
}

const CHECKS = Object.freeze({
  title: checkTitle,
  description: checkDescription,
  status: checkStatus,
  priority: checkPriority,
  dueDate: checkDueDate,
});

const asObject = (body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {});

/** FR-04. Title is required; omitted optional fields fall back to the model defaults. */
function validateCreateTask(body) {
  const source = asObject(body);
  const value = {};
  const errors = {};

  for (const [field, check] of Object.entries(CHECKS)) {
    const supplied = field === 'title' || source[field] !== undefined;
    if (!supplied) continue;
    const result = check(source[field]);
    if (result.error) errors[field] = result.error;
    else value[field] = result.value;
  }
  return { value, errors };
}

/**
 * FR-06, FR-08, FR-09. Partial update: only the fields present in the body are validated and
 * changed. At least one editable field is required.
 */
function validateUpdateTask(body) {
  const source = asObject(body);
  const value = {};
  const errors = {};

  for (const [field, check] of Object.entries(CHECKS)) {
    if (source[field] === undefined) continue;
    const result = check(source[field]);
    if (result.error) errors[field] = result.error;
    else value[field] = result.value;
  }
  if (!Object.keys(value).length && !Object.keys(errors).length) {
    errors.body = 'Provide at least one field to update';
  }
  return { value, errors };
}

module.exports = { sanitizeDescription, validateCreateTask, validateUpdateTask };
