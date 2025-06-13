# ZK-Vault Configuration Setup

This directory contains global configuration files that are shared across all
packages in the ZK-Vault monorepo. These configurations ensure consistency, code
quality, and maintainability across the entire project.

## 📁 Configuration Files

### Core Configurations

- **`eslint.config.js`** - ESLint configuration with TypeScript, security, and
  import rules
- **`prettier.config.js`** - Code formatting configuration for consistent style
- **`jest.config.js`** - Base Jest configuration for testing
- **`tsconfig.base.json`** - Base TypeScript configuration for all packages

### Utility Configurations

- **`commitlint.config.js`** - Conventional commit message linting
- **`lint-staged.config.js`** - Pre-commit hooks for code quality
- **`webpack.common.js`** - Shared Webpack configuration utility
- **`env.config.js`** - Environment variable management utility
- **`paths.config.js`** - Path mapping and alias configuration utility

## 🚀 Quick Start

### Setting Up a New Package

To set up configuration for a new package:

```bash
# Navigate to the tools directory
cd tools/scripts

# Set up configuration for a specific package
node setup-package-config.js web-app

# Set up configuration for all packages
node setup-package-config.js all

# Force overwrite existing configs
node setup-package-config.js web-app --force

# Set up only specific configurations
node setup-package-config.js crypto --configs eslint,jest,tsconfig
```

### Manual Setup

If you prefer to set up configurations manually, each package should extend the
global configs:

#### ESLint (`.eslintrc.js`)

```javascript
module.exports = {
  extends: ['../../tools/config/eslint.config.js'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // Package-specific overrides
  },
};
```

#### Prettier (`.prettierrc.js`)

```javascript
module.exports = require('../../tools/config/prettier.config.js');
```

#### Jest (`jest.config.js`)

```javascript
const baseConfig = require('../../tools/config/jest.config.js');
const {
  generateJestModuleMapping,
} = require('../../tools/config/paths.config');

module.exports = {
  ...baseConfig,
  displayName: 'package-name',
  moduleNameMapping: generateJestModuleMapping('package-name', __dirname),
};
```

#### TypeScript (`tsconfig.json`)

```json
{
  "extends": "../../tools/config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/src/*"],
      "@crypto/*": ["../crypto/src/*"]
    }
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }, { "path": "../crypto" }]
}
```

## 🛠 Configuration Details

### ESLint Configuration

The ESLint configuration includes:

- **TypeScript support** with strict type checking
- **Import/export validation** and ordering
- **Security rules** to prevent common vulnerabilities
- **Jest testing rules** for test files
- **Monorepo-specific path resolution**

Key rules:

- Enforces consistent import ordering
- Prevents unused variables and imports
- Validates TypeScript types
- Checks for security vulnerabilities
- Enforces code style consistency

### Prettier Configuration

Standardized formatting rules:

- 2-space indentation
- Single quotes for strings
- Semicolons required
- 100 character line length
- Trailing commas in ES5 contexts
- LF line endings

### Jest Configuration

Comprehensive testing setup:

- TypeScript support with `ts-jest`
- Code coverage reporting (70% threshold)
- Module path mapping for aliases
- Asset mocking for CSS/images
- Parallel test execution
- Watch mode support

### TypeScript Configuration

Strict TypeScript setup:

- ES2022 target with modern features
- Strict type checking enabled
- Declaration file generation
- Source maps for debugging
- Composite project support for monorepo
- Path mapping for clean imports

### Webpack Configuration

Shared webpack utilities:

- TypeScript/JavaScript processing
- CSS/SCSS module support
- Asset optimization
- Code splitting
- Development/production modes
- Source map generation
- Browser polyfills

## 🔧 Utility Functions

### Path Configuration

```javascript
const { getPackageInfo, generateWebpackAliases } = require('./paths.config');

// Get all package information
const packageInfo = getPackageInfo('web-app');

// Generate webpack aliases for a package
const aliases = generateWebpackAliases('web-app');

// Generate TypeScript paths
const tsPaths = generateTypeScriptPaths('web-app');
```

### Environment Configuration

```javascript
const { getEnvironmentConfig } = require('./env.config');

// Load and validate environment variables
const config = getEnvironmentConfig(__dirname, 'development');

// Create package-specific configuration
const webAppConfig = createPackageConfig('web-app', config);
```

### Webpack Configuration

```javascript
const { createWebpackConfig } = require('./webpack.common');

const config = createWebpackConfig({
  rootDir: __dirname,
  isProduction: true,
  alias: {
    '@custom': path.resolve(__dirname, 'custom'),
  },
});
```

## 📦 Package Structure

Each package should follow this structure:

```
packages/package-name/
├── src/
│   ├── index.ts
│   ├── components/
│   ├── utils/
│   └── types/
├── __tests__/
├── .eslintrc.js
├── .prettierrc.js
├── jest.config.js
├── jest.setup.js
├── tsconfig.json
├── webpack.config.js (for web packages)
└── package.json
```

## 🎯 Development Workflow

### Code Quality Checks

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Pre-commit Hooks

The repository uses Husky and lint-staged for pre-commit hooks:

1. **ESLint** - Checks and fixes code issues
2. **Prettier** - Formats code consistently
3. **Jest** - Runs related tests
4. **TypeScript** - Type checking
5. **Security** - Scans for secrets and vulnerabilities

### Commit Message Format

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:

- `feat(web-app): add password strength indicator`
- `fix(crypto): resolve key derivation bug`
- `docs(shared): update API documentation`
- `test(mobile-app): add login component tests`

## 🔍 Troubleshooting

### Common Issues

**TypeScript path resolution errors:**

- Ensure `tsconfig.json` extends the base configuration
- Check that path mappings are correctly set up
- Verify that referenced packages exist

**ESLint import errors:**

- Make sure all packages are properly installed
- Check that import paths match the actual file structure
- Verify that TypeScript paths are correctly configured

**Jest module resolution:**

- Ensure Jest configuration extends the base config
- Check that module name mappings are set up correctly
- Verify that mock files exist where referenced

**Webpack build errors:**

- Check that all required loaders are installed
- Verify that entry points exist
- Ensure that aliases are correctly configured

### Getting Help

1. Check the configuration files for inline comments
2. Review the setup script output for specific errors
3. Verify that all dependencies are installed
4. Check that file paths are correct for your package structure

## 📚 Additional Resources

- [ESLint Configuration Guide](https://eslint.org/docs/user-guide/configuring)
- [Prettier Configuration Options](https://prettier.io/docs/en/configuration.html)
- [Jest Configuration Reference](https://jestjs.io/docs/configuration)
- [TypeScript Configuration Reference](https://www.typescriptlang.org/tsconfig)
- [Webpack Configuration Guide](https://webpack.js.org/configuration/)

## 🤝 Contributing

When updating configurations:

1. Test changes across all affected packages
2. Update this documentation if needed
3. Consider backwards compatibility
4. Run the setup script to verify it works correctly
5. Update package dependencies if new tools are added

For questions or issues with the configuration setup, please create an issue or
reach out to the development team.
