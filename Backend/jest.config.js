/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**', '!src/scripts/**'],
  coverageDirectory: 'coverage',
  verbose: true,
  globals: {
    'ts-jest': {
      // Use the test-specific tsconfig so @types/jest types are in scope.
      // This resolves IDE errors: "Cannot find name 'jest'/'describe'/'expect'".
      tsconfig: './tsconfig.test.json',
    },
  },
};
