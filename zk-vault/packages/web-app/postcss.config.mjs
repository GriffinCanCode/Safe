/**
 * PostCSS Configuration for ZK-Vault Web App
 * Optimized for Tailwind CSS v4.1 with performance and browser compatibility
 * 
 * @see https://tailwindcss.com/docs/installation/using-postcss
 * @see https://postcss.org/
 */

export default {
  plugins: {
    // Import resolution for CSS @import statements
    'postcss-import': {},
    
    // Tailwind CSS v4.1 PostCSS plugin
    '@tailwindcss/postcss': {},
    
    // Nested CSS support for better organization
    'postcss-nested': {},
    
    // Modern CSS features with browser compatibility
    'postcss-preset-env': {
      stage: 2, // Use stable features
      features: {
        'nesting-rules': false, // Handled by postcss-nested
        'custom-media-queries': true,
        'custom-properties': true,
        'color-function': true,
        'lab-function': true,
        'oklab-function': true,
      },
      browsers: [
        'last 2 versions',
        '> 1%',
        'not dead',
        'not ie 11',
      ],
    },
    
    // Autoprefixer for vendor prefixes
    'autoprefixer': {
      grid: 'autoplace',
      flexbox: 'no-2009',
    },
    
    // CSS optimization for production
    ...(process.env.NODE_ENV === 'production' && {
      'cssnano': {
        preset: ['default', {
          // Preserve important comments
          discardComments: {
            removeAll: false,
          },
          // Optimize calc() expressions
          calc: true,
          // Merge duplicate rules
          mergeRules: true,
          // Optimize font weights
          normalizeUnicode: true,
          // Minify selectors
          minifySelectors: true,
          // Optimize z-index values
          zindex: false, // Keep original z-index values for predictability
        }],
      },
    }),
  },
}; 