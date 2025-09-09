module.exports = {
  projects: [
    // Frontend tests
    {
      displayName: 'Frontend',
      testMatch: ['<rootDir>/client/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/client/tsconfig.json',
          },
        ],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      collectCoverageFrom: [
        'client/src/**/*.{ts,tsx}',
        '!client/src/**/*.d.ts',
        '!client/src/main.tsx',
        '!client/src/vite-env.d.ts',
      ],
    },
    // Backend tests
    {
      displayName: 'Backend',
      testMatch: ['<rootDir>/server/**/*.test.{ts,js}', '<rootDir>/tests/api/**/*.test.{ts,js}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/api.setup.ts'],
      transform: {
        '^.+\\.(ts|js)$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/tsconfig.json',
          },
        ],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      collectCoverageFrom: [
        'server/**/*.{ts,js}',
        '!server/**/*.d.ts',
        '!server/index.ts',
      ],
    },
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
