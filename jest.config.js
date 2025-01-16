module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: [
    'dotenv/config',
    '<rootDir>/tests/env.setup.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts',
    '<rootDir>/tests/teardown.ts'
  ],
  // Resource management
  maxWorkers: '50%', // Limit to 50% of CPU cores
  workerIdleMemoryLimit: '512MB', // Restart workers that exceed memory limit
  maxConcurrency: 5, // Limit concurrent test files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true
    }]
  },
  testTimeout: 30000, // Reduce timeout to catch hanging tests
  verbose: true,
  collectCoverage: false, // Disable coverage by default for performance
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/api/verification/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'src/api/verification/**/*.ts',
    '!src/api/verification/types/**/*.ts'
  ],
  moduleNameMapper: {
    '@aws-sdk/client-s3': '<rootDir>/tests/api/verification/__mocks__/aws-sdk.ts',
    '@aws-sdk/client-rekognition': '<rootDir>/tests/api/verification/__mocks__/aws-sdk.ts',
    '@aws-sdk/client-textract': '<rootDir>/tests/api/verification/__mocks__/aws-sdk.ts',
    '@aws-sdk/client-dynamodb': '<rootDir>/tests/api/verification/__mocks__/aws-sdk.ts',
    '@aws-sdk/lib-dynamodb': '<rootDir>/tests/api/verification/__mocks__/aws-sdk.ts',
    '@aws-sdk/client-sns': '<rootDir>/tests/api/verification/__mocks__/aws-sdk.ts'
  }
};
