'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Strips credentials from a connection string so it is safe to log. */
function redactUri(uri = '') {
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

/**
 * Connects to MongoDB, retrying with exponential backoff (1s, 2s, 4s ... capped).
 * `connectFn` and `sleepFn` are injectable for unit tests.
 *
 * @returns {Promise<import('mongoose').Connection>}
 */
async function connectWithRetry({
  uri,
  maxRetries = 5,
  baseDelayMs = 1000,
  maxDelayMs = 15000,
  connectFn = (u) => mongoose.connect(u, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 }),
  sleepFn = sleep,
} = {}) {
  if (!uri) throw new Error('DB_URI is not set');

  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      await connectFn(uri);
      logger.info(`MongoDB connected (${redactUri(uri)})`);
      return mongoose.connection;
    } catch (err) {
      if (attempt > maxRetries) {
        throw new Error(`Could not connect to MongoDB after ${attempt} attempts: ${err.message}`);
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      logger.warn(`MongoDB attempt ${attempt} failed (${err.message}). Retrying in ${delay} ms`);
      await sleepFn(delay);
    }
  }
}

function registerConnectionLogging() {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

/** Human readable connection state for /health. */
function dbState() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectWithRetry, disconnect, dbState, redactUri, registerConnectionLogging };
