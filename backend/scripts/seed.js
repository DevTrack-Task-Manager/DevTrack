'use strict';

/**
 * Seeds the demo accounts used in the Test Plan data tables so QA can start testing immediately.
 *   npm run seed
 * Refuses to run in production.
 */
const config = require('../config/env');
const { connectWithRetry, disconnect } = require('../config/db');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

const DEMO_USERS = [
  { name: 'Test User', email: 'test@demo.com', password: 'Test@123' },
  { name: 'Priya S', email: 'priya@demo.com', password: 'Priya@2024' },
];

async function main() {
  if (config.isProd) throw new Error('Refusing to seed demo users in production');
  await connectWithRetry({ uri: config.dbUri, maxRetries: 2, baseDelayMs: 500 });

  for (const demo of DEMO_USERS) {
    const exists = await User.exists({ email: demo.email });
    if (exists) {
      console.log(`  exists   ${demo.email}`);
      continue;
    }
    await User.create({ ...demo, password: await hashPassword(demo.password) });
    console.log(`  created  ${demo.email}  (password: ${demo.password})`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(disconnect);
