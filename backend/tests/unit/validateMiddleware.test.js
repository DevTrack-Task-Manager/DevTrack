'use strict';

const validate = require('../../middleware/validate');
const AppError = require('../../utils/AppError');

const run = (middleware, req) => {
  const next = jest.fn();
  middleware(req, {}, next);
  return next;
};

describe('validate middleware (FR-12)', () => {
  const validator = (input) =>
    input && input.ok === true ? { value: { clean: true }, errors: {} } : { value: {}, errors: { ok: 'ok must be true', other: 'second' } };

  test('body: success stores the sanitised value on req.validated and calls next() with no error', () => {
    const req = { body: { ok: true } };
    const next = run(validate(validator), req);
    expect(req.validated).toEqual({ clean: true });
    expect(next).toHaveBeenCalledWith();
  });

  test('body: failure calls next(AppError 400) with the first message and the field map', () => {
    const req = { body: {} };
    const next = run(validate(validator), req);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('ok must be true');
    expect(err.fields).toEqual({ ok: 'ok must be true', other: 'second' });
    expect(req.validated).toBeUndefined();
  });

  test('params: reads req.params and stores req.validatedParams', () => {
    const req = { params: { ok: true } };
    run(validate.params(validator), req);
    expect(req.validatedParams).toEqual({ clean: true });
  });

  test('params: failure is a 400', () => {
    const next = run(validate.params(validator), { params: { ok: false } });
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  test('query: reads req.query and stores req.validatedQuery', () => {
    const req = { query: { ok: true } };
    run(validate.query(validator), req);
    expect(req.validatedQuery).toEqual({ clean: true });
  });

  test('query: failure is a 400', () => {
    const next = run(validate.query(validator), { query: {} });
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });
});
