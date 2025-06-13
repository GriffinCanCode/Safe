const baseConfig = require('../../tools/config/jest.config.js');
const { generateJestModuleMapping } = require('../../tools/config/paths.config');

module.exports = {
  ...baseConfig,
  displayName: 'shared',
  rootDir: '.',
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    ...generateJestModuleMapping('shared', __dirname),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Package-specific Jest configuration
  testEnvironment: 'node',
};
