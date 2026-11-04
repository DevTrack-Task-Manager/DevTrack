'use strict';

const AppError = require('../../utils/AppError');
const { errorHandler, notFound } = require('../../middleware/errorHandler');

jest.mock('../../utils/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }));
const logger = require('../../utils/logger');

function respond(err) {
  const res = {
    headersSent: false,
    statusCode: undefined,
    body: undefined,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  errorHandler(err, { method: 'GET', originalUrl: '/x' }, res, jest.fn());
  return res;
}

describe('errorHandler (FR-12): every response is { error: string } and never leaks internals', () => {
  beforeEach(() => jest.clearAllMocks());

  test('AppError keeps its status, message and optional field map', () => {
    const res = respond(AppError.badRequest('Bad thing', { title: 'Bad thing' }));
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Bad thing', fields: { title: 'Bad thing' } });
  });

  test('AppError without fields has exactly one key', () => {
    expect(Object.keys(respond(AppError.notFound('Task not found')).body)).toEqual(['error']);
  });

  test('401 adds a WWW-Authenticate header', () => {
    expect(respond(AppError.unauthorized()).headers['WWW-Authenticate']).toBe('Bearer');
  });

  test('malformed JSON -> 400', () => {
    const res = respond(Object.assign(new SyntaxError('Unexpected token } in JSON at position 5'), { type: 'entity.parse.failed' }));
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Malformed JSON in request body' });
  });

  test('oversized body -> 413', () => {
    expect(respond(Object.assign(new Error('too large'), { type: 'entity.too.large' })).statusCode).toBe(413);
  });

  test('unsupported charset -> 415 with a generic message', () => {
    const res = respond(Object.assign(new Error('unsupported charset "UTF-7"'), { type: 'charset.unsupported', status: 415 }));
    expect(res.statusCode).toBe(415);
    expect(res.body).toEqual({ error: 'Unsupported content encoding' });
  });

  test('other framework 4xx errors never forward the framework message', () => {
    const res = respond(Object.assign(new Error('request aborted at /secret/path'), { status: 400, type: 'request.aborted' }));
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request' });
  });

  test('Mongoose validation errors -> 400 with a field map', () => {
    const res = respond({ name: 'ValidationError', errors: { status: { message: 'Status must be Pending, In Progress or Completed' } } });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Status must be Pending, In Progress or Completed');
    expect(res.body.fields).toEqual({ status: 'Status must be Pending, In Progress or Completed' });
  });

  test('CastError -> 400', () => {
    expect(respond({ name: 'CastError', path: '_id' }).statusCode).toBe(400);
  });

  test('duplicate key -> 409', () => {
    expect(respond({ code: 11000, keyPattern: { email: 1 } }).body.error).toBe('Email already registered');
  });

  test('unknown errors -> 500 with a generic body; the stack is logged, not sent', () => {
    const err = new Error('connect ECONNREFUSED 10.0.0.5:27017 password=hunter2');
    const res = respond(err);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|hunter2|stack| at /);
    expect(logger.error).toHaveBeenCalled();
  });

  test('does nothing when headers were already sent', () => {
    const res = { headersSent: true, status: jest.fn(), json: jest.fn() };
    errorHandler(new Error('x'), {}, res, jest.fn());
    expect(res.status).not.toHaveBeenCalled();
  });

  test('notFound forwards a 404 AppError', () => {
    const next = jest.fn();
    notFound({}, {}, next);
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
