/**
 * Tailwind CSS v4.1 Configuration
 * Optimized for ZK-Vault Web Application
 * 
 * @see https://tailwindcss.com/docs/configuration
 * @see https://tailwindcss.com/docs/content-configuration
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Content sources for class detection and purging
  content: {
    files: [
      "./src/**/*.{js,ts,jsx,tsx,vue,html}",
      "./public/index.html",
      "../shared/src/**/*.{js,ts,jsx,tsx,vue}",
      // Include component library files if any
      "./node_modules/@headlessui/vue/**/*.js",
    ],
    // Extract classes from dynamic content
    extract: {
      vue: (content) => {
        // Extract classes from Vue template and script sections
        const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        
        let classes = [];
        
        if (templateMatch) {
          classes = classes.concat(templateMatch[1].match(/class="([^"]*)"/g) || []);
          classes = classes.concat(templateMatch[1].match(/class='([^']*)'/g) || []);
          classes = classes.concat(templateMatch[1].match(/:class="([^"]*)"/g) || []);
        }
        
        if (scriptMatch) {
          // Extract classes from computed properties and methods
          classes = classes.concat(scriptMatch[1].match(/'([^']*\s+[^']*\s+[^']*)'/g) || []);
          classes = classes.concat(scriptMatch[1].match(/"([^"]*\s+[^"]*\s+[^"]*)"/g) || []);
        }
        
        return classes.join(' ').match(/[\w-/:]+/g) || [];
      },
    },
  },

  // Core plugins for enhanced functionality
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),
  ],

  // Theme extensions and customizations
  theme: {
    extend: {
      // Color system optimized for accessibility and brand consistency
      colors: {
        // Primary brand colors
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
        },
        // Security status colors
        security: {
          safe: 'rgb(var(--color-security-safe) / <alpha-value>)',
          warning: 'rgb(var(--color-security-warning) / <alpha-value>)',
          danger: 'rgb(var(--color-security-danger) / <alpha-value>)',
          critical: 'rgb(var(--color-security-critical) / <alpha-value>)',
        },
      },

      // Animation optimizations for performance
      animation: {
        // Fast micro-interactions (< 300ms)
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'slide-left': 'slideLeft 0.25s ease-out',
        'slide-right': 'slideRight 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        
        // Loading states
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        
        // Page transitions
        'page-enter': 'pageEnter 0.4s ease-out',
        'page-exit': 'pageExit 0.3s ease-in',
        
        // Security indicators
        'security-pulse': 'securityPulse 2s ease-in-out infinite',
        'strength-fill': 'strengthFill 0.5s ease-out',
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
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pageEnter: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pageExit: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-16px)', opacity: '0' },
        },
        securityPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        strengthFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--strength-width, 0%)' },
        },
      },

      // Performance optimized timing functions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },

      // Typography scale for consistent text sizing
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },

      // Spacing scale for consistent layout
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Border radius for consistent component styling
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      // Box shadows for depth and elevation
      boxShadow: {
        'soft': '0 2px 8px 0 rgb(0 0 0 / 0.08)',
        'medium': '0 4px 16px 0 rgb(0 0 0 / 0.12)',
        'strong': '0 8px 32px 0 rgb(0 0 0 / 0.16)',
        'glow': '0 0 20px rgb(var(--color-primary-500) / 0.3)',
      },
    },
  },

  // Optimization settings for production builds
  future: {
    hoverOnlyWhenSupported: true,
  },

  // Experimental features
  experimental: {
    optimizeUniversalDefaults: true,
  },
};
