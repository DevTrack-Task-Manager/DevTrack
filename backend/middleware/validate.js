'use strict';

const AppError = require('../utils/AppError');
const { firstError } = require('../utils/validators');

/**
 * Wraps a pure validator `(body) => ({ value, errors })` as Express middleware.
 * On success the sanitised payload is available as `req.validated`.
 * On failure responds 400 with the first message plus a per-field map for inline UI errors (FR-12).
 * Issue #10 will reuse this for task payloads.
 */
const validate = (validator) => (req, _res, next) => {
  const { value, errors } = validator(req.body);
  if (Object.keys(errors).length) {
    return next(AppError.badRequest(firstError(errors), errors));
  }
  req.validated = value;
  return next();
};

module.exports = validate;
