'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/** 404 for any route that did not match. */
const notFound = (_req, _res, next) => next(AppError.notFound('Route not found'));

/** Maps Mongoose validation errors to a field map. */
function mongooseFields(err) {
  const fields = {};
  for (const [path, detail] of Object.entries(err.errors || {})) fields[path] = detail.message;
  return fields;
}

/**
 * Central error handler. Always responds with `{ "error": "<message>" }`.
 * Stack traces and internal messages are logged server side and never sent to clients.
 */
function errorHandler(err, req, res, _next) {
  if (res.headersSent) return undefined;

  let status = 500;
  let message = 'Internal server error';
  let fields;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    fields = err.fields;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    fields = mongooseFields(err);
    message = Object.values(fields)[0] || 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field === 'email' ? 'Email already registered' : 'Duplicate value';
    if (field) fields = { [field]: message };
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, err.stack || err);
  }

  if (status === 401) res.set('WWW-Authenticate', 'Bearer');

  const body = { error: message };
  if (fields && Object.keys(fields).length) body.fields = fields;
  return res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
