#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { getPackageInfo, PACKAGES } = require("../config/paths.config");
const { createWebpackConfig } = require("../config/webpack.common");

/**
 * Setup package configurations based on global configs
 * This script helps initialize or update package-specific config files
 */

const CONFIG_TEMPLATES = {
  // ESLint configuration for packages
  eslint: (packageName) => `module.exports = {
  extends: ['../../tools/config/eslint.config.js'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // Package-specific overrides can go here
  },
};`,

  // Prettier configuration for packages
  prettier: () =>
    `module.exports = require('../../tools/config/prettier.config.js');`,

  // Jest configuration for packages
  jest: (packageName) => {
    const packageInfo = getPackageInfo(packageName);
    return `const baseConfig = require('../../tools/config/jest.config.js');
const { generateJestModuleMapping } = require('../../tools/config/paths.config');

module.exports = {
  ...baseConfig,
  displayName: '${packageName}',
  rootDir: '.',
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    ...generateJestModuleMapping('${packageName}', __dirname),
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],
  // Package-specific Jest configuration
  testEnvironment: '${packageName.includes("web") || packageName.includes("browser") ? "jsdom" : "node"}',
};`;
  },

  // TypeScript configuration for packages
  tsconfig: (packageName) => {
    const packageInfo = getPackageInfo(packageName);
    return JSON.stringify(
      {
        extends: "../../tools/config/tsconfig.base.json",
        compilerOptions: {
          ...packageInfo.tsConfig,
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*", "types/**/*"],
        exclude: ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"],
        references:
          packageName !== "shared" && packageName !== "crypto"
            ? [{ path: "../shared" }, { path: "../crypto" }]
            : [],
      },
      null,
      2,
    );
  },

  // Webpack configuration for web packages
  webpack: (packageName) => {
    if (!["web-app", "browser-extension"].includes(packageName)) {
      return null;
    }

    return `const { createWebpackConfig } = require('../../tools/config/webpack.common');
const { generateWebpackAliases } = require('../../tools/config/paths.config');

const packageConfig = createWebpackConfig({
  rootDir: __dirname,
  alias: generateWebpackAliases('${packageName}', __dirname),
});

module.exports = {
  ...packageConfig,
  entry: './src/index.${packageName === "web-app" ? "tsx" : "ts"}',
  
  // Package-specific webpack configuration
  ${
    packageName === "web-app"
      ? `
  plugins: [
    ...packageConfig.plugins,
    // Add React-specific plugins here
  ],`
      : ""
  }
  
  ${
    packageName === "browser-extension"
      ? `
  output: {
    ...packageConfig.output,
    filename: '[name].js', // Browser extensions prefer static names
  },`
      : ""
  }
};`;
  },

  // Package.json scripts update
  packageJsonScripts: (packageName) => ({
    build:
      packageName === "mobile-app"
        ? "react-native bundle"
        : "webpack --mode=production",
    dev:
      packageName === "web-app"
        ? "webpack serve --mode=development"
        : packageName === "mobile-app"
          ? "react-native start"
          : "webpack --mode=development --watch",
    test: "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    lint: "eslint src/ --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint src/ --ext .ts,.tsx,.js,.jsx --fix",
    "type-check": "tsc --noEmit",
    format: 'prettier --write "src/**/*.{ts,tsx,js,jsx,json,md}"',
    clean: "rm -rf dist coverage",
  }),

  // Jest setup file
  jestSetup: (packageName) => `// Jest setup for ${packageName}
import 'jest-extended';

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Add common test utilities here
};

${
  packageName.includes("web") || packageName.includes("browser")
    ? `
// DOM testing setup
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-testid' });

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
`
    : ""
}

${
  packageName === "mobile-app"
    ? `
// React Native testing setup
import { jest } from '@jest/globals';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(options => options.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
}));
`
    : ""
}`,
};

/**
 * Create configuration files for a package
 * @param {string} packageName Name of the package
 * @param {Object} options Configuration options
 */
function setupPackageConfig(packageName, options = {}) {
  const { force = false, configs = ["all"] } = options;

  if (!PACKAGES[packageName]) {
    throw new Error(`Unknown package: ${packageName}`);
  }

  const packageDir = PACKAGES[packageName];
  const packageInfo = getPackageInfo(packageName);

  console.log(`Setting up configuration for ${packageName}...`);

  // Ensure package directory exists
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir, { recursive: true });
  }

  // Create configuration files
  const configsToCreate = configs.includes("all")
    ? ["eslint", "prettier", "jest", "tsconfig", "webpack", "jestSetup"]
    : configs;

  configsToCreate.forEach((configType) => {
    const template = CONFIG_TEMPLATES[configType];
    if (!template) {
      console.warn(`Unknown config type: ${configType}`);
      return;
    }

    const content = template(packageName);
    if (!content) {
      return; // Skip configs that don't apply to this package
    }

    const fileName = getConfigFileName(configType, packageName);
    const filePath = path.resolve(packageDir, fileName);

    if (!fs.existsSync(filePath) || force) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Created ${fileName}`);
    } else {
      console.log(
        `- Skipped ${fileName} (already exists, use --force to overwrite)`,
      );
    }
  });

  // Update package.json scripts
  updatePackageJsonScripts(packageDir, packageName, force);

  console.log(`Configuration setup complete for ${packageName}!\n`);
}

/**
 * Get config file name for a config type
 * @param {string} configType Type of configuration
 * @param {string} packageName Package name to check for ES module usage
 * @returns {string} File name
 */
function getConfigFileName(configType, packageName) {
  // Check if package uses ES modules
  const packageDir = PACKAGES[packageName];
  const packageJsonPath = path.resolve(packageDir, "package.json");
  let isESModule = false;

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      isESModule = packageJson.type === "module";
    } catch (error) {
      // Ignore parsing errors
    }
  }

  const fileNames = {
    eslint: isESModule ? ".eslintrc.cjs" : ".eslintrc.js",
    prettier: isESModule ? ".prettierrc.cjs" : ".prettierrc.js",
    jest: "jest.config.js",
    tsconfig: "tsconfig.json",
    webpack: "webpack.config.js",
    jestSetup: "jest.setup.js",
  };

  return fileNames[configType] || `${configType}.config.js`;
}

/**
 * Update package.json scripts
 * @param {string} packageDir Package directory
 * @param {string} packageName Package name
 * @param {boolean} force Whether to force update
 */
function updatePackageJsonScripts(packageDir, packageName, force) {
  const packageJsonPath = path.resolve(packageDir, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    // Create basic package.json if it doesn't exist
    const packageJson = {
      name: `@zk-vault/${packageName}`,
      version: "1.0.0",
      private: true,
      scripts: CONFIG_TEMPLATES.packageJsonScripts(packageName),
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✓ Created package.json");
    return;
  }

  // Update existing package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const newScripts = CONFIG_TEMPLATES.packageJsonScripts(packageName);

  packageJson.scripts = packageJson.scripts || {};

  let updated = false;
  Object.entries(newScripts).forEach(([script, command]) => {
    if (!packageJson.scripts[script] || force) {
      packageJson.scripts[script] = command;
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log("✓ Updated package.json scripts");
  }
}

/**
 * Setup configuration for all packages
 * @param {Object} options Configuration options
 */
function setupAllPackagesConfig(options = {}) {
  console.log("Setting up configuration for all packages...\n");

  Object.keys(PACKAGES).forEach((packageName) => {
    setupPackageConfig(packageName, options);
  });

  console.log("All packages configured successfully!");
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const packageName = args[0];
  const force = args.includes("--force");
  const configs = args.includes("--configs")
    ? args[args.indexOf("--configs") + 1]?.split(",") || ["all"]
    : ["all"];

  if (packageName === "all") {
    setupAllPackagesConfig({ force, configs });
  } else if (packageName && PACKAGES[packageName]) {
    setupPackageConfig(packageName, { force, configs });
  } else {
    console.log(`
Usage: node setup-package-config.js <package-name> [options]

Arguments:
  package-name    Name of the package to configure (or 'all' for all packages)
                  Available packages: ${Object.keys(PACKAGES).join(", ")}

Options:
  --force        Overwrite existing configuration files
  --configs      Comma-separated list of configs to create
                 Available: eslint,prettier,jest,tsconfig,webpack,jestSetup
                 Default: all

Examples:
  node setup-package-config.js web-app
  node setup-package-config.js all --force
  node setup-package-config.js crypto --configs eslint,jest,tsconfig
`);
    process.exit(1);
  }
}

module.exports = {
  setupPackageConfig,
  setupAllPackagesConfig,
  CONFIG_TEMPLATES,
};
