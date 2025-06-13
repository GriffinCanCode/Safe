module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type rules
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Formatting, missing semi colons, etc; no code change
        'refactor', // Refactoring production code
        'test', // Adding tests, refactoring test; no production code change
        'chore', // Updating build tasks, package manager configs, etc; no production code change
        'perf', // Performance improvements
        'ci', // CI/CD related changes
        'build', // Build system changes
        'revert', // Reverting changes
      ],
    ],

    // Subject rules
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 100],
    'subject-min-length': [2, 'always', 4],

    // Header rules
    'header-max-length': [2, 'always', 120],
    'header-min-length': [2, 'always', 10],

    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // Footer rules
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],

    // Scope rules for monorepo
    'scope-enum': [
      1,
      'always',
      [
        'web-app',
        'mobile-app',
        'browser-extension',
        'crypto',
        'shared',
        'functions',
        'infrastructure',
        'security',
        'docs',
        'tools',
        'tests',
        'deps',
        'config',
        'ci',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
  },

  // Custom plugins for additional validation
  plugins: [
    {
      rules: {
        // Custom rule to ensure scope is provided for certain types
        'scope-required-for-types': parsed => {
          const { type, scope } = parsed;
          const typesRequiringScope = ['feat', 'fix', 'perf', 'refactor'];

          if (typesRequiringScope.includes(type) && !scope) {
            return [
              false,
              `Scope is required for type '${type}'. Use one of: ${[
                'web-app',
                'mobile-app',
                'browser-extension',
                'crypto',
                'shared',
                'functions',
                'infrastructure',
                'security',
              ].join(', ')}`,
            ];
          }

          return [true];
        },
      },
    },
  ],

  // Help URL for contributors
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};
