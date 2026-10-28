'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/helpers/env.js'],
  // First run may download a mongod binary for mongodb-memory-server.
  testTimeout: 60000,
  collectCoverageFrom: [
    'config/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    'server.js',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
};
