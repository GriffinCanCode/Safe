import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Create Vite configuration for Vue packages
 * @param {Object} options Configuration options
 * @param {string} options.rootDir Root directory of the package
 * @param {Object} options.alias Additional module aliases
 * @param {boolean} options.isProduction Whether this is a production build
 * @returns {Object} Vite configuration
 */
export function createViteConfig(options = {}) {
  const { rootDir, alias = {}, isProduction = process.env.NODE_ENV === 'production' } = options;

  if (!rootDir) {
    throw new Error('rootDir is required for Vite configuration');
  }

  const srcPath = resolve(rootDir, 'src');

  return defineConfig({
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: tag => tag.startsWith('ion-'),
          },
        },
      }),
    ],

    resolve: {
      alias: {
        '@': srcPath,
        '@shared': resolve(rootDir, '../../packages/shared/src'),
        '@crypto': resolve(rootDir, '../../packages/crypto/src'),
        ...alias,
      },
    },

    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },

    build: {
      target: 'es2015',
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          },
        },
      },
    },

    server: {
      port: 3000,
      open: true,
      cors: true,
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
    },

    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'firebase/app'],
    },
  });
}

export default createViteConfig;
