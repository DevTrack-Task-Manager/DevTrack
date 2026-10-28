'use strict';

/**
 * Operational error that is safe to show to the client.
 * The central error handler turns it into `{ "error": message }`
 * (plus an optional `fields` map for inline form errors).
 */
class AppError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} message Human-readable message
   * @param {Record<string,string>} [fields] Field-level messages
   */
  constructor(statusCode, message, fields) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.fields = fields && Object.keys(fields).length ? fields : undefined;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message, fields) {
    return new AppError(400, message, fields);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, message);
  }

  static conflict(message, fields) {
    return new AppError(409, message, fields);
  }
}

module.exports = AppError;
