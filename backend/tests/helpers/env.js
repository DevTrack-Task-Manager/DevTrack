'use strict';

// Runs before every test file (jest `setupFiles`), before any app code is imported.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // test only
process.env.BCRYPT_ROUNDS = '10'; // the minimum SEC-01 allows, keeps the suite fast
delete process.env.LOG_LEVEL;
