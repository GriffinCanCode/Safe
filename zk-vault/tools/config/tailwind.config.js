/** @type {import('tailwindcss').Config} */

const path = require('path');

/**
 * Create Tailwind CSS configuration for packages
 * @param {Object} options Configuration options
 * @param {string} options.packagePath Path to the package
 * @param {Array} options.content Additional content paths
 * @param {Object} options.theme Custom theme overrides
 * @returns {Object} Tailwind configuration
 */
function createTailwindConfig(options = {}) {
  const {
    packagePath = process.cwd(),
    content = [],
    theme = {},
    plugins = [],
  } = options;

  return {
    content: [
      // Default content paths
      path.resolve(packagePath, 'src/**/*.{js,ts,jsx,tsx,vue,html}'),
      path.resolve(packagePath, 'public/index.html'),
      
      // Shared components
      path.resolve(packagePath, '../../packages/shared/src/**/*.{js,ts,jsx,tsx,vue}'),
      
      // Additional content paths
      ...content,
    ],

    theme: {
      extend: {
        // Brand colors
        colors: {
          // Primary brand colors
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49',
          },

          // Secondary colors
          secondary: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7c3aed',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764',
          },

          // Security/Trust colors
          success: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
          },

          warning: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
            950: '#451a03',
          },

          danger: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },

          // Neutral colors for ZK Vault
          neutral: {
            25: '#fcfcfd',
            50: '#f9fafb',
            100: '#f2f4f7',
            200: '#eaecf0',
            300: '#d0d5dd',
            400: '#98a2b3',
            500: '#667085',
            600: '#475467',
            700: '#344054',
            800: '#1d2939',
            900: '#101828',
            950: '#0c111d',
          },
        },

        // Typography
        fontFamily: {
          sans: [
            'Inter',
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Helvetica Neue',
            'Arial',
            'sans-serif',
          ],
          mono: [
            'JetBrains Mono',
            'Fira Code',
            'SF Mono',
            'Monaco',
            'Inconsolata',
            'Roboto Mono',
            'monospace',
          ],
        },

        fontSize: {
          '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
          'xs': ['0.75rem', { lineHeight: '1rem' }],
          'sm': ['0.875rem', { lineHeight: '1.25rem' }],
          'base': ['1rem', { lineHeight: '1.5rem' }],
          'lg': ['1.125rem', { lineHeight: '1.75rem' }],
          'xl': ['1.25rem', { lineHeight: '1.75rem' }],
          '2xl': ['1.5rem', { lineHeight: '2rem' }],
          '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
          '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
          '5xl': ['3rem', { lineHeight: '1' }],
          '6xl': ['3.75rem', { lineHeight: '1' }],
          '7xl': ['4.5rem', { lineHeight: '1' }],
          '8xl': ['6rem', { lineHeight: '1' }],
          '9xl': ['8rem', { lineHeight: '1' }],
        },

        // Spacing
        spacing: {
          '4.5': '1.125rem',
          '5.5': '1.375rem',
          '6.5': '1.625rem',
          '7.5': '1.875rem',
          '8.5': '2.125rem',
          '9.5': '2.375rem',
          '13': '3.25rem',
          '15': '3.75rem',
          '17': '4.25rem',
          '18': '4.5rem',
          '19': '4.75rem',
          '21': '5.25rem',
          '22': '5.5rem',
          '25': '6.25rem',
          '26': '6.5rem',
          '30': '7.5rem',
          '34': '8.5rem',
          '42': '10.5rem',
          '50': '12.5rem',
          '54': '13.5rem',
          '58': '14.5rem',
          '62': '15.5rem',
          '66': '16.5rem',
          '70': '17.5rem',
          '74': '18.5rem',
          '78': '19.5rem',
          '82': '20.5rem',
          '86': '21.5rem',
          '90': '22.5rem',
          '94': '23.5rem',
          '98': '24.5rem',
        },

        // Border radius
        borderRadius: {
          '4xl': '2rem',
          '5xl': '2.5rem',
          '6xl': '3rem',
        },

        // Box shadows
        boxShadow: {
          'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          'md': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          'lg': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          'xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
          'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
          'glow': '0 0 20px rgb(59 130 246 / 0.3)',
          'glow-sm': '0 0 10px rgb(59 130 246 / 0.2)',
          'glow-lg': '0 0 40px rgb(59 130 246 / 0.4)',
        },

        // Animation
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'fade-out': 'fadeOut 0.5s ease-in-out',
          'slide-in': 'slideIn 0.3s ease-out',
          'slide-out': 'slideOut 0.3s ease-in',
          'bounce-slow': 'bounce 2s infinite',
          'pulse-slow': 'pulse 3s infinite',
          'spin-slow': 'spin 3s linear infinite',
          'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
          'wiggle': 'wiggle 1s ease-in-out infinite',
          'shimmer': 'shimmer 2s linear infinite',
        },

        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          fadeOut: {
            '0%': { opacity: '1' },
            '100%': { opacity: '0' },
          },
          slideIn: {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(0)' },
          },
          slideOut: {
            '0%': { transform: 'translateX(0)' },
            '100%': { transform: 'translateX(100%)' },
          },
          wiggle: {
            '0%, 100%': { transform: 'rotate(-3deg)' },
            '50%': { transform: 'rotate(3deg)' },
          },
          shimmer: {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
        },

        // Custom theme overrides
        ...theme,
      },
    },

    plugins: [
      // Form plugin for better form styling
      require('@tailwindcss/forms'),
      
      // Typography plugin for prose content
      require('@tailwindcss/typography'),
      
      // Aspect ratio plugin
      require('@tailwindcss/aspect-ratio'),

      // Custom plugin for ZK Vault utilities
      function({ addUtilities, addComponents, theme }) {
        // Custom utilities
        addUtilities({
          '.safe-area': {
            paddingTop: 'env(safe-area-inset-top)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
          },
          '.scrollbar-hide': {
            '-ms-overflow-style': 'none',
            'scrollbar-width': 'none',
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          },
          '.text-gradient': {
            'background': 'linear-gradient(135deg, theme("colors.primary.500"), theme("colors.secondary.500"))',
            '-webkit-background-clip': 'text',
            '-webkit-text-fill-color': 'transparent',
            'background-clip': 'text',
          },
        });

        // Custom components
        addComponents({
          '.btn': {
            padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
            borderRadius: theme('borderRadius.md'),
            fontWeight: theme('fontWeight.medium'),
            fontSize: theme('fontSize.sm'),
            lineHeight: theme('lineHeight.5'),
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            border: '1px solid transparent',
            '&:focus': {
              outline: '2px solid transparent',
              outlineOffset: '2px',
              boxShadow: `0 0 0 2px ${theme('colors.primary.500')}`,
            },
            '&:disabled': {
              opacity: '0.5',
              cursor: 'not-allowed',
            },
          },
          '.btn-primary': {
            backgroundColor: theme('colors.primary.500'),
            color: theme('colors.white'),
            '&:hover': {
              backgroundColor: theme('colors.primary.600'),
            },
            '&:active': {
              backgroundColor: theme('colors.primary.700'),
            },
          },
          '.btn-secondary': {
            backgroundColor: theme('colors.neutral.100'),
            color: theme('colors.neutral.700'),
            borderColor: theme('colors.neutral.300'),
            '&:hover': {
              backgroundColor: theme('colors.neutral.200'),
            },
            '&:active': {
              backgroundColor: theme('colors.neutral.300'),
            },
          },
          '.card': {
            backgroundColor: theme('colors.white'),
            borderRadius: theme('borderRadius.lg'),
            boxShadow: theme('boxShadow.sm'),
            border: `1px solid ${theme('colors.neutral.200')}`,
            padding: theme('spacing.6'),
          },
          '.input': {
            padding: `${theme('spacing.3')} ${theme('spacing.4')}`,
            borderRadius: theme('borderRadius.md'),
            border: `1px solid ${theme('colors.neutral.300')}`,
            fontSize: theme('fontSize.sm'),
            lineHeight: theme('lineHeight.5'),
            transition: 'all 0.2s ease-in-out',
            '&:focus': {
              outline: '2px solid transparent',
              outlineOffset: '2px',
              borderColor: theme('colors.primary.500'),
              boxShadow: `0 0 0 1px ${theme('colors.primary.500')}`,
            },
            '&::placeholder': {
              color: theme('colors.neutral.400'),
            },
          },
        });
      },

      // Additional plugins
      ...plugins,
    ],

    // Dark mode configuration
    darkMode: 'class',
  };
}

module.exports = {
  createTailwindConfig,
}; 