const path = require('path');
const webpack = require('webpack');

/**
 * Common webpack configuration shared across packages
 * @param {Object} options Configuration options
 * @param {string} options.rootDir Root directory of the package
 * @param {string} options.srcDir Source directory (default: 'src')
 * @param {string} options.distDir Distribution directory (default: 'dist')
 * @param {boolean} options.isProduction Whether this is a production build
 * @param {Object} options.alias Additional module aliases
 * @returns {Object} Webpack configuration
 */
function createWebpackConfig(options = {}) {
  const {
    rootDir,
    srcDir = 'src',
    distDir = 'dist',
    isProduction = process.env.NODE_ENV === 'production',
    alias = {},
  } = options;

  if (!rootDir) {
    throw new Error('rootDir is required for webpack configuration');
  }

  const srcPath = path.resolve(rootDir, srcDir);
  const distPath = path.resolve(rootDir, distDir);

  return {
    mode: isProduction ? 'production' : 'development',

    // Source maps
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    // Entry point (to be overridden by individual packages)
    entry: path.resolve(srcPath, 'index.ts'),

    // Output configuration
    output: {
      path: distPath,
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      clean: true,
      publicPath: '/',
    },

    // Module resolution
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': srcPath,
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@crypto': path.resolve(__dirname, '../../packages/crypto/src'),
        ...alias,
      },
      // Fallbacks for Node.js polyfills
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      },
    },

    // Module rules
    module: {
      rules: [
        // TypeScript/JavaScript
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: 'defaults' }],
                  '@babel/preset-typescript',
                  ['@babel/preset-react', { runtime: 'automatic' }],
                ],
                plugins: [
                  '@babel/plugin-proposal-class-properties',
                  '@babel/plugin-transform-runtime',
                ],
              },
            },
          ],
        },

        // CSS/SCSS
        {
          test: /\.(css|scss|sass)$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  auto: true,
                  localIdentName: isProduction
                    ? '[hash:base64]'
                    : '[name]__[local]--[hash:base64:5]',
                },
              },
            },
            'sass-loader',
          ],
        },

        // Assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[hash][ext][query]',
          },
        },

        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[hash][ext][query]',
          },
        },
      ],
    },

    // Plugins
    plugins: [
      // Environment variables
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.DEBUG': JSON.stringify(process.env.DEBUG),
      }),

      // Provide polyfills
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      }),
    ],

    // Optimization
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    },

    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 250000,
      maxEntrypointSize: 250000,
    },

    // Stats
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },
  };
}

module.exports = { createWebpackConfig };
