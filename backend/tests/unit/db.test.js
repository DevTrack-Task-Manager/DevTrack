'use strict';

const { connectWithRetry, redactUri } = require('../../config/db');

describe('connectWithRetry (Issue #9)', () => {
  const uri = 'mongodb://user:secret@127.0.0.1:27017/devtrack';

  test('retries with exponential backoff and succeeds', async () => {
    const connectFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(undefined);
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    await connectWithRetry({ uri, connectFn, sleepFn, baseDelayMs: 100 });

    expect(connectFn).toHaveBeenCalledTimes(3);
    expect(sleepFn.mock.calls.map(([ms]) => ms)).toEqual([100, 200]);
  });

  test('caps the delay at maxDelayMs', async () => {
    const connectFn = jest.fn().mockRejectedValue(new Error('down'));
    const sleepFn = jest.fn().mockResolvedValue(undefined);
    await expect(
      connectWithRetry({ uri, connectFn, sleepFn, maxRetries: 4, baseDelayMs: 1000, maxDelayMs: 3000 })
    ).rejects.toThrow();
    expect(sleepFn.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 3000, 3000]);
  });

  test('gives up after maxRetries and reports the cause', async () => {
    const connectFn = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    await expect(connectWithRetry({ uri, connectFn, sleepFn, maxRetries: 2 })).rejects.toThrow(
      /after 3 attempts: ECONNREFUSED/
    );
    expect(connectFn).toHaveBeenCalledTimes(3);
  });

  test('rejects immediately when no URI is given', async () => {
    await expect(connectWithRetry({})).rejects.toThrow(/DB_URI/);
  });

  test('redactUri hides credentials', () => {
    expect(redactUri(uri)).toBe('mongodb://***@127.0.0.1:27017/devtrack');
    expect(redactUri('mongodb://127.0.0.1:27017/x')).toBe('mongodb://127.0.0.1:27017/x');
  });
});
