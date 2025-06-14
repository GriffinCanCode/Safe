/**
 * PostCSS Configuration for ZK-Vault Web App
 * Optimized for Tailwind CSS v4.1 with performance and browser compatibility
 * 
 * @see https://tailwindcss.com/docs/installation/using-postcss
 * @see https://postcss.org/
 */

export default {
  plugins: {
    // Tailwind CSS v4.1 PostCSS plugin (replaces old 'tailwindcss' plugin)
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
    
    // CSS optimization for production with preserved formatting
    ...(process.env.NODE_ENV === 'production' && {
      'cssnano': {
        preset: ['default', {
          // Preserve important comments and structure
          discardComments: {
            removeAll: false,
            removeAllButFirst: false,
          },
          // Preserve formatting for better debugging
          normalizeWhitespace: false,
          // Optimize calc() expressions
          calc: true,
          // Merge duplicate rules
          mergeRules: true,
          // Optimize font weights
          normalizeUnicode: true,
          // Minify selectors but preserve readability
          minifySelectors: {
            // Keep class names readable
            keepQuotes: true,
          },
          // Optimize z-index values
          zindex: false, // Keep original z-index values for predictability
          // Preserve CSS custom properties structure
          reduceIdents: false,
          // Keep CSS structure for better debugging
          mergeLonghand: false,
        }],
      },
    }),
    
    // Development-only: CSS formatting preservation
    ...(process.env.NODE_ENV === 'development' && {
      'postcss-prettify': {
        indentSize: 2,
        keepComments: true,
        keepEmptyLines: true,
      },
    }),
  },
}; 