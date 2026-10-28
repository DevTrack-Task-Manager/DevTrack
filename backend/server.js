'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env'); // loads .env and validates it (fails fast on bad config)
const { connectWithRetry, disconnect, dbState, registerConnectionLogging } = require('./config/db');
const createApiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

/**
 * Builds the Express app without starting it, so tests can drive it with Supertest.
 * Middleware chain (TDD 2.1): helmet -> CORS -> JSON parser -> routes -> 404 -> error handler.
 *
 * @param {{ rateLimit?: Partial<typeof config.rateLimit> }} [options]
 */
function createApp(options = {}) {
  const app = express();
  const rateLimit = { ...config.rateLimit, ...options.rateLimit };

  app.set('trust proxy', config.trustProxy);
  app.use(helmet());

  app.use(
    cors({
      // Requests without an Origin header (curl, Postman, server to server) are allowed.
      origin: (origin, callback) => callback(null, !origin || config.clientOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    })
  );

  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbState(),
    });
  });

  app.use('/api', createApiRouter({ rateLimit }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

/** Listens first (so /health answers immediately), then connects to MongoDB with retry. */
async function start() {
  registerConnectionLogging();
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`DevTrack API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);
    const force = setTimeout(() => process.exit(1), 10000);
    force.unref();
    server.close(async () => {
      await disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });

  try {
    await connectWithRetry({
      uri: config.dbUri,
      maxRetries: config.db.maxRetries,
      baseDelayMs: config.db.retryBaseDelayMs,
    });
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start };
