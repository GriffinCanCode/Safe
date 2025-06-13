import { createViteConfig } from '../../tools/config/vite.config.js';

export default createViteConfig({
  rootDir: __dirname,
  alias: {
    '@components': './src/components',
    '@pages': './src/pages',
    '@hooks': './src/hooks',
    '@utils': './src/utils',
    '@services': './src/services',
    '@types': './src/types',
    '@assets': './src/assets',
  },
});