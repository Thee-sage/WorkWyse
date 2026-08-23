/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Seeds process.env before any module is imported, so suites run against
  // the real config/env.ts rather than a hand-maintained mock.
  setupFiles: ['<rootDir>/src/tests/setup/testEnv.ts'],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**',
    '!src/scripts/**',
    '!src/seed.ts',
    '!src/app.ts',
  ],
  coverageDirectory: 'coverage',

  // Security-critical modules are held to a higher bar than the codebase
  // average. A drop below these fails `npm run test:ci`, which is what the
  // deploy gate runs.
  // Floors sit just below the levels actually achieved, so they catch a
  // regression rather than blocking the first honest run. Raise them when
  // coverage genuinely improves.
  coverageThreshold: {
    './src/middleware/': { statements: 85, branches: 70, functions: 90, lines: 85 },
    './src/utils/urlGuard.ts': { statements: 92, branches: 88, functions: 100, lines: 92 },
    './src/validators/': { statements: 95, branches: 95, functions: 95, lines: 95 },
  },

  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },

  verbose: true,
  // Surface a suite that leaks a handle instead of letting it hang CI.
  testTimeout: 20000,
};
