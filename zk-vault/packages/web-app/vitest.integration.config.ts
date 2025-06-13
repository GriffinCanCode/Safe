import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],

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
      // Monorepo package aliases - use src for development
      '@zk-vault/shared': resolve(__dirname, '../shared/src'),
      '@zk-vault/crypto': resolve(__dirname, '../crypto/src'),
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.integration.setup.ts'],
  },
});
