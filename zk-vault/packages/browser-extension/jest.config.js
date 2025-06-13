const baseConfig = require('../../tools/config/jest.config.js');
const { generateJestModuleMapping } = require('../../tools/config/paths.config');

module.exports = {
  ...baseConfig,
  displayName: 'browser-extension',
  rootDir: '.',
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    ...generateJestModuleMapping('browser-extension', __dirname),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Package-specific Jest configuration
  testEnvironment: 'jsdom',
};
