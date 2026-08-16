module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@feedbackkit)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // The JS SDK is a peerDependency and is not installed here, so it is mocked.
  // ⚠️ This key must match what `src/` actually imports. It read `@feedbackkit/js`
  // until 2026-08-15 — the package's name before it was renamed `feedbackkit-js` —
  // so the mapping matched nothing and every suite failed to RESOLVE. That was
  // invisible because `npm test` exits 0 even when jest runs zero tests.
  moduleNameMapper: {
    '^feedbackkit-js$': '<rootDir>/__mocks__/feedbackkit-js.ts',
  },
};
