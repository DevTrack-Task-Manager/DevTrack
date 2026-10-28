'use strict';

/**
 * One-time local setup: creates backend/.env from .env.example with a fresh JWT_SECRET.
 *   npm run setup
 * Never overwrites an existing .env, so it is safe to run twice.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.env');
const example = path.join(root, '.env.example');

if (fs.existsSync(target)) {
  console.log('backend/.env already exists, leaving it untouched.');
  process.exit(0);
}

const secret = crypto.randomBytes(32).toString('hex');
const contents = fs.readFileSync(example, 'utf8').replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
fs.writeFileSync(target, contents, { mode: 0o600 });

console.log('Created backend/.env with a new JWT_SECRET.');
console.log('Check DB_URI inside it, then run: npm run dev');