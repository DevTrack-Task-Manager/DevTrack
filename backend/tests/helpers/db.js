'use strict';

const mongoose = require('mongoose');
require('../../models'); // register schemas so indexes can be built

let memoryServer;
let usedExternalDb = false;

/**
 * Connects Mongoose to an isolated test database.
 *  - TEST_DB_URI set (CI service container, local mongod): uses it with a unique database name.
 *  - otherwise: spins up mongodb-memory-server (downloads a mongod binary on first run).
 */
async function connectTestDb() {
  const external = process.env.TEST_DB_URI;
  if (external) {
    usedExternalDb = true;
    const dbName = `devtrack_test_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await mongoose.connect(external, { dbName });
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
  }
  // Unique indexes must exist before the first insert or duplicate tests are flaky.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

async function closeTestDb() {
  if (usedExternalDb && mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectTestDb, clearTestDb, closeTestDb };
