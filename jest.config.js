/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts'],
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js',
  // Integration tests share one seeded in-memory MongoDB (seeded once in
  // globalSetup). Now that the claim test mutates RewardDistribution
  // documents, test FILES must not run concurrently against that shared
  // state.
  maxWorkers: 1,
};
