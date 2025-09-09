/** @type {import('jest').Config} */
const config = {
  projects: [
    // Frontend tests with jsdom environment
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/components/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            jsx: 'react-jsx'
          }
        }]
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      collectCoverageFrom: [
        'client/src/**/*.{ts,tsx}',
        '!client/src/**/*.d.ts',
        '!client/src/main.tsx',
        '!client/src/vite-env.d.ts'
      ]
    },
    // Backend tests with node environment
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/api/**/*.test.{ts,js}',
        '<rootDir>/tests/performance/**/*.test.{ts,js}'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/api.setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/server/$1'
      },
      transform: {
        '^.+\\.(ts|js)$': ['ts-jest', {
          useESM: true,
          tsconfig: 'tsconfig.test.json'
        }]
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'server/**/*.{ts,js}',
        '!server/**/*.d.ts',
        '!server/index.ts'
      ]
    }
  ],
  // Global configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Test execution settings
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true
};

export default config;
