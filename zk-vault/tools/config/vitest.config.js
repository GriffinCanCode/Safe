import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Create Vitest configuration for Vue packages
 * @param {Object} options Configuration options
 * @param {string} options.rootDir Root directory of the package
 * @param {string} options.packageName Package name for display
 * @param {Object} options.alias Additional module aliases
 * @returns {Object} Vitest configuration
 */
export function createVitestConfig(options = {}) {
  const {
    rootDir,
    packageName = 'package',
    alias = {},
  } = options;

  if (!rootDir) {
    throw new Error('rootDir is required for Vitest configuration');
  }

  const srcPath = resolve(rootDir, 'src');

  return defineConfig({
    plugins: [vue()],

    resolve: {
      alias: {
        '@': srcPath,
        '@shared': resolve(rootDir, '../../packages/shared/src'),
        '@crypto': resolve(rootDir, '../../packages/crypto/src'),
        ...alias,
      },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      
      // Coverage configuration
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.test.{ts,tsx,js,jsx}',
          '**/*.spec.{ts,tsx,js,jsx}',
          '**/__tests__/**',
          '**/coverage/**',
          '**/*.d.ts',
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },

      // Test file patterns
      include: [
        'src/**/*.{test,spec}.{js,ts,tsx,vue}',
        '__tests__/**/*.{js,ts,tsx,vue}',
      ],

      // Mock CSS modules
      css: {
        modules: {
          classNameStrategy: 'stable',
        },
      },

      // Test timeout
      testTimeout: 10000,

      // Display name
      name: packageName,

      // Reporter configuration
      reporters: ['verbose'],

      // Parallel execution
      threads: true,
    },

    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
  });
}

export default createVitestConfig; 