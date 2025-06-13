const path = require('path');

/**
 * Shared paths configuration for the ZK-Vault monorepo
 * Used by TypeScript, Webpack, Jest, and other build tools
 */

// Root directories
const MONOREPO_ROOT = path.resolve(__dirname, '../..');
const PACKAGES_ROOT = path.resolve(MONOREPO_ROOT, 'packages');
const TOOLS_ROOT = path.resolve(MONOREPO_ROOT, 'tools');
const FUNCTIONS_ROOT = path.resolve(MONOREPO_ROOT, 'functions');

// Package directories
const PACKAGES = {
  'web-app': path.resolve(PACKAGES_ROOT, 'web-app'),
  'mobile-app': path.resolve(PACKAGES_ROOT, 'mobile-app'),
  'browser-extension': path.resolve(PACKAGES_ROOT, 'browser-extension'),
  crypto: path.resolve(PACKAGES_ROOT, 'crypto'),
  shared: path.resolve(PACKAGES_ROOT, 'shared'),
};

// Source directories for each package
const PACKAGE_SRC_DIRS = Object.entries(PACKAGES).reduce((acc, [name, dir]) => {
  acc[name] = path.resolve(dir, 'src');
  return acc;
}, {});

// Build/distribution directories
const PACKAGE_DIST_DIRS = Object.entries(PACKAGES).reduce((acc, [name, dir]) => {
  acc[name] = path.resolve(dir, 'dist');
  return acc;
}, {});

/**
 * Generate TypeScript path mapping for a specific package
 * @param {string} packageName Name of the package
 * @param {string} packageRoot Root directory of the package
 * @returns {Object} TypeScript paths configuration
 */
function generateTypeScriptPaths(packageName, packageRoot) {
  const baseUrl = packageRoot || PACKAGES[packageName];

  if (!baseUrl) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  return {
    baseUrl: '.',
    paths: {
      // Self reference
      '@/*': ['./src/*'],

      // Shared packages
      '@shared/*': [path.relative(baseUrl, path.resolve(PACKAGE_SRC_DIRS.shared, '*'))],
      '@crypto/*': [path.relative(baseUrl, path.resolve(PACKAGE_SRC_DIRS.crypto, '*'))],

      // Package-specific aliases based on dependencies
      ...(packageName === 'web-app' && {
        '@components/*': ['./src/components/*'],
        '@pages/*': ['./src/pages/*'],
        '@hooks/*': ['./src/hooks/*'],
        '@utils/*': ['./src/utils/*'],
        '@services/*': ['./src/services/*'],
        '@types/*': ['./src/types/*'],
        '@assets/*': ['./src/assets/*'],
      }),

      ...(packageName === 'mobile-app' && {
        '@screens/*': ['./src/screens/*'],
        '@components/*': ['./src/components/*'],
        '@navigation/*': ['./src/navigation/*'],
        '@hooks/*': ['./src/hooks/*'],
        '@utils/*': ['./src/utils/*'],
        '@services/*': ['./src/services/*'],
        '@types/*': ['./src/types/*'],
        '@assets/*': ['./src/assets/*'],
      }),

      ...(packageName === 'browser-extension' && {
        '@background/*': ['./src/background/*'],
        '@content/*': ['./src/content/*'],
        '@popup/*': ['./src/popup/*'],
        '@options/*': ['./src/options/*'],
        '@utils/*': ['./src/utils/*'],
        '@types/*': ['./src/types/*'],
      }),
    },
  };
}

/**
 * Generate Webpack aliases for a specific package
 * @param {string} packageName Name of the package
 * @param {string} packageRoot Root directory of the package
 * @returns {Object} Webpack alias configuration
 */
function generateWebpackAliases(packageName, packageRoot) {
  const baseDir = packageRoot || PACKAGES[packageName];

  if (!baseDir) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  const srcDir = path.resolve(baseDir, 'src');

  return {
    // Self reference
    '@': srcDir,

    // Shared packages
    '@shared': PACKAGE_SRC_DIRS.shared,
    '@crypto': PACKAGE_SRC_DIRS.crypto,

    // Package-specific aliases
    ...(packageName === 'web-app' && {
      '@components': path.resolve(srcDir, 'components'),
      '@pages': path.resolve(srcDir, 'pages'),
      '@hooks': path.resolve(srcDir, 'hooks'),
      '@utils': path.resolve(srcDir, 'utils'),
      '@services': path.resolve(srcDir, 'services'),
      '@types': path.resolve(srcDir, 'types'),
      '@assets': path.resolve(srcDir, 'assets'),
    }),

    ...(packageName === 'mobile-app' && {
      '@screens': path.resolve(srcDir, 'screens'),
      '@components': path.resolve(srcDir, 'components'),
      '@navigation': path.resolve(srcDir, 'navigation'),
      '@hooks': path.resolve(srcDir, 'hooks'),
      '@utils': path.resolve(srcDir, 'utils'),
      '@services': path.resolve(srcDir, 'services'),
      '@types': path.resolve(srcDir, 'types'),
      '@assets': path.resolve(srcDir, 'assets'),
    }),

    ...(packageName === 'browser-extension' && {
      '@background': path.resolve(srcDir, 'background'),
      '@content': path.resolve(srcDir, 'content'),
      '@popup': path.resolve(srcDir, 'popup'),
      '@options': path.resolve(srcDir, 'options'),
      '@utils': path.resolve(srcDir, 'utils'),
      '@types': path.resolve(srcDir, 'types'),
    }),
  };
}

/**
 * Generate Jest module name mapping for a specific package
 * @param {string} packageName Name of the package
 * @param {string} packageRoot Root directory of the package
 * @returns {Object} Jest moduleNameMapping configuration
 */
function generateJestModuleMapping(packageName, packageRoot) {
  const baseDir = packageRoot || PACKAGES[packageName];

  if (!baseDir) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  return {
    // Self reference
    '^@/(.*)$': '<rootDir>/src/$1',

    // Shared packages
    '^@shared/(.*)$': path.resolve(PACKAGE_SRC_DIRS.shared, '$1'),
    '^@crypto/(.*)$': path.resolve(PACKAGE_SRC_DIRS.crypto, '$1'),

    // Asset mocking
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  };
}

/**
 * Get package information
 * @param {string} packageName Name of the package
 * @returns {Object} Package information
 */
function getPackageInfo(packageName) {
  if (!PACKAGES[packageName]) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  return {
    name: packageName,
    root: PACKAGES[packageName],
    src: PACKAGE_SRC_DIRS[packageName],
    dist: PACKAGE_DIST_DIRS[packageName],
    tsConfig: generateTypeScriptPaths(packageName),
    webpackAliases: generateWebpackAliases(packageName),
    jestModuleMapping: generateJestModuleMapping(packageName),
  };
}

/**
 * Get all packages information
 * @returns {Object} All packages information
 */
function getAllPackagesInfo() {
  return Object.keys(PACKAGES).reduce((acc, packageName) => {
    acc[packageName] = getPackageInfo(packageName);
    return acc;
  }, {});
}

module.exports = {
  // Constants
  MONOREPO_ROOT,
  PACKAGES_ROOT,
  TOOLS_ROOT,
  FUNCTIONS_ROOT,
  PACKAGES,
  PACKAGE_SRC_DIRS,
  PACKAGE_DIST_DIRS,

  // Functions
  generateTypeScriptPaths,
  generateWebpackAliases,
  generateJestModuleMapping,
  getPackageInfo,
  getAllPackagesInfo,
};
