const baseConfig = require('../../tools/config/jest.config.js');
const { generateJestModuleMapping } = require('../../tools/config/paths.config');

module.exports = {
  ...baseConfig,
  displayName: 'web-app',
  rootDir: '.',
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    ...generateJestModuleMapping('web-app', __dirname),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Package-specific Jest configuration
  testEnvironment: 'jsdom',
};
