'use strict';

const AppError = require('../utils/AppError');
const { firstError } = require('../utils/validators');

/**
 * Wraps a pure validator `(input) => ({ value, errors })` as Express middleware (FR-12).
 *
 *   validate(validator)         checks req.body    -> sanitised result in req.validated
 *   validate.params(validator)  checks req.params  -> sanitised result in req.validatedParams
 *   validate.query(validator)   checks req.query   -> sanitised result in req.validatedQuery
 *
 * On failure the request is stopped with a 400 whose body is `{ "error": "<first message>" }`
 * plus a per-field map for inline UI errors. Handlers must read the validated copy, never the
 * raw request, so unvalidated input cannot reach the database.
 */
function build(source, target) {
  return (validator) => (req, _res, next) => {
    const { value, errors } = validator(req[source]);
    if (Object.keys(errors).length) {
      return next(AppError.badRequest(firstError(errors), errors));
    }
    req[target] = value;
    return next();
  };
}

const validate = build('body', 'validated');
validate.params = build('params', 'validatedParams');
validate.query = build('query', 'validatedQuery');

module.exports = validate;
