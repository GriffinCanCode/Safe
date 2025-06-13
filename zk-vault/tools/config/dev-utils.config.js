const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Development Utilities Configuration
 * Tools for bundle analysis, performance monitoring, and development assistance
 */

/**
 * Bundle analyzer configuration
 * @param {string} packagePath Path to the package
 * @param {Object} options Analysis options
 */
function createBundleAnalyzer(packagePath, options = {}) {
  const { 
    outputPath = 'bundle-analysis',
    openBrowser = true,
    analyzeMode = 'static'
  } = options;

  return {
    webpack: {
      plugins: [
        // Webpack Bundle Analyzer
        ...(process.env.ANALYZE === 'true' ? [
          new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
            analyzerMode,
            openAnalyzer: openBrowser,
            reportFilename: path.resolve(packagePath, outputPath, 'webpack-report.html'),
            generateStatsFile: true,
            statsFilename: path.resolve(packagePath, outputPath, 'webpack-stats.json'),
          })
        ] : []),
      ],
    },
    
    vite: {
      plugins: [
        // Rollup Bundle Analyzer for Vite
        ...(process.env.ANALYZE === 'true' ? [
          require('rollup-plugin-visualizer')({
            filename: path.resolve(packagePath, outputPath, 'vite-stats.html'),
            open: openBrowser,
            gzipSize: true,
            brotliSize: true,
          })
        ] : []),
      ],
    },
  };
}

/**
 * Performance monitoring configuration
 * @param {string} packageName Package name
 */
function createPerformanceConfig(packageName) {
  return {
    // Web Vitals configuration
    webVitals: {
      enabled: process.env.NODE_ENV !== 'test',
      reportWebVitals: (metric) => {
        console.log(`[${packageName}] ${metric.name}: ${metric.value}`);
        
        // Send to analytics in production
        if (process.env.NODE_ENV === 'production') {
          // gtag('event', metric.name, {
          //   value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          //   event_label: metric.id,
          //   non_interaction: true,
          // });
        }
      },
    },

    // Bundle size monitoring
    bundleSize: {
      maxSize: '500kb',
      warnSize: '300kb',
      trackAssets: true,
    },

    // Memory leak detection
    memoryLeaks: {
      enabled: process.env.NODE_ENV === 'development',
      interval: 30000, // Check every 30 seconds
      threshold: 50 * 1024 * 1024, // 50MB threshold
    },
  };
}

/**
 * Code quality metrics configuration
 */
function createCodeQualityConfig() {
  return {
    // Complexity analysis
    complexity: {
      max: 10,
      warn: 7,
      excludePatterns: ['**/*.test.*', '**/*.spec.*'],
    },

    // Code coverage requirements
    coverage: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
      excludePatterns: [
        'src/**/*.stories.*',
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/mocks/**',
        'src/types/**',
      ],
    },

    // Dependency analysis
    dependencies: {
      checkOutdated: true,
      checkVulnerabilities: true,
      checkLicenses: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
    },
  };
}

/**
 * Development server configuration with hot reloading and debugging
 * @param {string} packageName Package name
 */
function createDevServerConfig(packageName) {
  const isWebApp = packageName === 'web-app';
  const isBrowserExtension = packageName === 'browser-extension';

  return {
    // HMR configuration
    hmr: {
      enabled: true,
      overlay: true,
      clientLogLevel: 'info',
    },

    // Proxy configuration for API calls
    proxy: {
      '/api': {
        target: process.env.API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
      },
    },

    // HTTPS configuration for development
    https: {
      enabled: isBrowserExtension, // Required for browser extensions
      key: process.env.HTTPS_KEY_PATH,
      cert: process.env.HTTPS_CERT_PATH,
    },

    // Dev tools configuration
    devtools: {
      enabled: process.env.NODE_ENV === 'development',
      ...(isWebApp && {
        vueDevtools: true,
      }),
    },

    // Source map configuration
    sourceMaps: {
      development: 'eval-source-map',
      production: 'source-map',
    },
  };
}

/**
 * Generate development scripts for package.json
 * @param {string} packageName Package name
 */
function generateDevScripts(packageName) {
  const isWebApp = packageName === 'web-app';
  const isMobileApp = packageName === 'mobile-app';
  const isBrowserExtension = packageName === 'browser-extension';

  const scripts = {
    // Development
    'dev': isWebApp ? 'vite --mode development' :
           isMobileApp ? 'react-native start' :
           isBrowserExtension ? 'webpack --mode development --watch' :
           'npm run build -- --watch',

    'dev:debug': isWebApp ? 'vite --mode development --debug' :
                 'npm run dev -- --verbose',

    'dev:https': isWebApp ? 'vite --mode development --https' :
                 isBrowserExtension ? 'webpack-dev-server --https' :
                 'npm run dev',

    // Building
    'build:analyze': 'cross-env ANALYZE=true npm run build',
    'build:profile': isWebApp ? 'vite build --mode production --profile' :
                     'webpack --mode production --profile --json > webpack-stats.json',

    // Testing with different options
    'test:watch': 'npm run test -- --watch',
    'test:debug': 'npm run test -- --no-coverage --verbose',
    'test:ui': isWebApp ? 'vitest --ui' : 'npm run test -- --watch',

    // Quality checks
    'quality:complexity': 'npx ts-complex --threshold 10 src/',
    'quality:deps': 'npx depcheck && npm audit',
    'quality:bundle': 'npm run build:analyze',
    'quality:all': 'npm run lint && npm run type-check && npm run test && npm run quality:complexity',

    // Performance monitoring
    'perf:lighthouse': isWebApp ? 'lhci autorun' : 'echo "Lighthouse not available for this package"',
    'perf:bundle': 'npm run build:analyze',

    // Maintenance
    'deps:update': 'npx npm-check-updates -u && npm install',
    'deps:audit': 'npm audit fix',
    'clean:full': 'npm run clean && rm -rf node_modules package-lock.json && npm install',
  };

  return scripts;
}

/**
 * Create VS Code configuration for the project
 * @param {string} rootDir Project root directory
 */
function createVSCodeConfig(rootDir) {
  const vscodeDir = path.resolve(rootDir, '.vscode');
  
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir);
  }

  // Settings
  const settings = {
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "eslint.workingDirectories": ["packages/*"],
    "typescript.preferences.includePackageJsonAutoImports": "auto",
    "files.associations": {
      "*.vue": "vue"
    },
    "emmet.includeLanguages": {
      "vue": "html"
    },
    "vetur.validation.template": false,
    "vetur.validation.script": false,
    "vetur.validation.style": false,
    "[vue]": {
      "editor.defaultFormatter": "johnsoncodehk.volar"
    }
  };

  fs.writeFileSync(
    path.resolve(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );

  // Extensions
  const extensions = {
    "recommendations": [
      "esbenp.prettier-vscode",
      "dbaeumer.vscode-eslint",
      "ms-vscode.vscode-typescript-next",
      "johnsoncodehk.volar",
      "vue.vscode-typescript-vue-plugin",
      "bradlc.vscode-tailwindcss",
      "ms-vscode.test-adapter-converter",
      "hbenl.vscode-test-explorer"
    ]
  };

  fs.writeFileSync(
    path.resolve(vscodeDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2)
  );

  // Launch configuration
  const launch = {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Debug Web App",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/packages/web-app/node_modules/.bin/vite",
        "args": ["--mode", "development"],
        "console": "integratedTerminal",
        "cwd": "${workspaceFolder}/packages/web-app"
      },
      {
        "name": "Debug Tests",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/node_modules/.bin/jest",
        "args": ["--runInBand"],
        "console": "integratedTerminal",
        "internalConsoleOptions": "neverOpen"
      }
    ]
  };

  fs.writeFileSync(
    path.resolve(vscodeDir, 'launch.json'),
    JSON.stringify(launch, null, 2)
  );
}

/**
 * Generate GitHub Actions workflow for CI/CD
 * @param {string} rootDir Project root directory
 */
function createGitHubActions(rootDir) {
  const workflowsDir = path.resolve(rootDir, '.github', 'workflows');
  
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }

  const ciWorkflow = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: true

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build packages
        run: npm run build
      
      - name: Run bundle analysis
        run: npm run build:analyze
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: packages/*/dist/

  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript`;

  fs.writeFileSync(
    path.resolve(workflowsDir, 'ci.yml'),
    ciWorkflow
  );
}

module.exports = {
  createBundleAnalyzer,
  createPerformanceConfig,
  createCodeQualityConfig,
  createDevServerConfig,
  generateDevScripts,
  createVSCodeConfig,
  createGitHubActions,
}; 