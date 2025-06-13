const baseConfig = require('../../tools/config/jest.config.js');
const { generateJestModuleMapping } = require('../../tools/config/paths.config');

module.exports = {
  ...baseConfig,
  displayName: 'mobile-app',
  rootDir: '.',
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    ...generateJestModuleMapping('mobile-app', __dirname),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Package-specific Jest configuration
  testEnvironment: 'node',
};
