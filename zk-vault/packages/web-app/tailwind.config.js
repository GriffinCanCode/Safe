const { createTailwindConfig } = require('../../tools/config/tailwind.config.js');

module.exports = createTailwindConfig({
  packagePath: __dirname,
  content: [
    // Add any additional content paths specific to this package
  ],
  theme: {
    // Package-specific theme overrides
  },
});