module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests/api/endpoints/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // ts-jest config options here
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globals: {
    // Remove any ts-jest config from globals if present
  },
  testTimeout: 30000, // Increase timeout for API calls
  maxConcurrency: 5, // Limit concurrent tests to avoid overwhelming the test API
};
