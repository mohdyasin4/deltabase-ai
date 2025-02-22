module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  testMatch: ['**/src/**/*.test.(ts|tsx|js|jsx)'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8'
};