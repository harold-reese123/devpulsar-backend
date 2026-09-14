/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts'],
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js',
};
