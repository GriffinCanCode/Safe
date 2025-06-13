import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('ion-'),
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
      // Monorepo package aliases
      '@zk-vault/shared': resolve(__dirname, '../shared/src'),
      '@zk-vault/crypto': resolve(__dirname, '../crypto/src'),
    },
  },

  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },

  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions', 'firebase/storage'],
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
      'pako'
    ],
    exclude: ['@zk-vault/crypto', '@zk-vault/shared'],
  },

  worker: {
    format: 'es',
  },
});