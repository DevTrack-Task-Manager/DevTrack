'use strict';

/**
 * Minimal leveled logger. Silent under test unless LOG_LEVEL is set.
 * Never pass passwords, tokens or full connection strings to it.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function activeLevel() {
  const requested = process.env.LOG_LEVEL;
  if (requested && requested in LEVELS) return LEVELS[requested];
  if (process.env.NODE_ENV === 'test') return -1;
  return process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug;
}

function write(level, args) {
  if (LEVELS[level] > activeLevel()) return;
  const stream = level === 'error' || level === 'warn' ? console.error : console.log;
  stream(`[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)}`, ...args);
}

module.exports = {
  error: (...args) => write('error', args),
  warn: (...args) => write('warn', args),
  info: (...args) => write('info', args),
  debug: (...args) => write('debug', args),
};
