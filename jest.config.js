module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**',
    '!src/mocks/**',
    '!src/**/index.ts',
    '!src/**/*.d.ts'
  ],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests/api/endpoints/**/*.test.ts',
    '**/tests/api/services/**/*.test.ts',
    '**/tests/api/Credex/**/*.test.ts',
    '**/tests/api/Member/**/*.test.ts',  // Added pattern for Member tests
    '**/tests/api/App/**/*.test.ts',     // Added pattern for App tests
    '**/tests/api/error-cases/**/*.errors.ts',  // Added pattern for error test files
    '**/tests/integration/**/*.test.ts'  // Added pattern for integration tests
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  maxConcurrency: 5
};
