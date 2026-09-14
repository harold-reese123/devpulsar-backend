module.exports = async function globalTeardown() {
  const mongod = globalThis.__DEVPULSAR_MONGOD__;
  if (mongod) {
    await mongod.stop();
  }
};
