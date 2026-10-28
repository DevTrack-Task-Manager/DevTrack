'use strict';

const request = require('supertest');
const { createApp } = require('../../server');

const app = createApp();

describe('application shell (Phase A)', () => {
  test('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.database).toBeDefined();
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });

  test('malformed JSON returns 400 without a stack trace', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.co", ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Malformed JSON in request body' });
  });

  test('oversized bodies are rejected with 413', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x'.repeat(20000), email: 'a@b.co', password: 'Test@123' });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Request body is too large' });
  });

  test('security headers are set and x-powered-by is hidden', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('CORS allows the configured client origin only', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request(app).get('/health').set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('every error body has the { error } shape', async () => {
    const responses = await Promise.all([
      request(app).get('/nope'),
      request(app).get('/api/auth/me'),
      request(app).post('/api/auth/login').send({}),
    ]);
    for (const res of responses) {
      expect(typeof res.body.error).toBe('string');
      expect(res.body.stack).toBeUndefined();
    }
  });
});
