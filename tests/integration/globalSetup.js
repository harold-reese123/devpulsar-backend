// Runs once, in Jest's main process, before any test file. Not transformed
// by ts-jest, so it registers ts-node itself to require the TS seed module.
require('ts-node/register/transpile-only');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

module.exports = async function globalSetup() {
  // Pinned to a stable, well-tested server line — an unpinned install
  // pulled the newest available build (8.2.6), whose wire-protocol
  // handshake hung against the installed driver version.
  const mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  globalThis.__DEVPULSAR_MONGOD__ = mongod;
  process.env.MONGODB_URI = mongod.getUri();

  // Seed once, here, rather than per test file — test files run as
  // separate worker processes, and each calling seedDatabase() against the
  // same shared in-memory instance would race and corrupt each other's data.
  await mongoose.connect(mongod.getUri());
  const { seedDatabase } = require('../../src/scripts/seedDatabase');
  await seedDatabase();
  await mongoose.disconnect();
};
