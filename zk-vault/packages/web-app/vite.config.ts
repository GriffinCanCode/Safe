import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
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
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/services': resolve(__dirname, './src/services'),
      '@/store': resolve(__dirname, './src/store'),
      '@/composables': resolve(__dirname, './src/composables'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/workers': resolve(__dirname, './src/workers'),
      '@/views': resolve(__dirname, './src/views'),
      // Monorepo package aliases - use built dist for better compatibility
      '@zk-vault/shared': resolve(__dirname, '../shared/dist'),
      '@zk-vault/crypto': resolve(__dirname, '../crypto/dist'),
      // Browser compatibility - redirect problematic Node.js modules to stubs
      'libsodium-wrappers': resolve(__dirname, './src/utils/browser-stubs.ts'),
      argon2: resolve(__dirname, './src/utils/browser-stubs.ts'),
    },
  },

  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    global: 'globalThis',
    'process.env': {},
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v18.0.0'),
  },

  build: {
    target: 'es2020',
    sourcemap: true,
    commonjsOptions: {
      include: [/node_modules/, /packages\/crypto\/dist/, /packages\/shared\/dist/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [
        '@mapbox/node-pre-gyp',
        'node-pre-gyp',
        'mock-aws-s3',
        'nock',
        'aws-sdk',
        'argon2',
        'libsodium-wrappers',
      ],
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
            'firebase/storage',
          ],
          crypto: ['@zk-vault/crypto'],
          shared: ['@zk-vault/shared'],
          workers: ['comlink'],
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
    cors: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    fs: {
      // Allow serving files from one level up to access monorepo packages
      allow: ['..'],
    },
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/storage',
      'fuse.js',
      'comlink',
      'pako',
      '@zk-vault/crypto',
      '@zk-vault/shared',
      '@stablelib/xchacha20poly1305',
    ],
    exclude: [
      '@mapbox/node-pre-gyp',
      'node-pre-gyp',
      'mock-aws-s3',
      'nock',
      'aws-sdk',
      'argon2',
      'libsodium-wrappers',
    ],
    force: true,
  },

  ssr: {
    noExternal: ['@zk-vault/crypto', '@zk-vault/shared'],
  },

  worker: {
    format: 'es',
  },
});
