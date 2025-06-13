const { createWebpackConfig } = require('../../tools/config/webpack.common');
const { generateWebpackAliases } = require('../../tools/config/paths.config');

const packageConfig = createWebpackConfig({
  rootDir: __dirname,
  alias: generateWebpackAliases('web-app', __dirname),
});

module.exports = {
  ...packageConfig,
  entry: './src/index.tsx',

  // Package-specific webpack configuration

  plugins: [
    ...packageConfig.plugins,
    // Add React-specific plugins here
  ],
};
