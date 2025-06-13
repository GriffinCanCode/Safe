module.exports = {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix --cache --max-warnings 0',
    'prettier --write',
    'jest --findRelatedTests --passWithNoTests',
  ],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.md': ['prettier --write', 'markdownlint --fix'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write'],

  // CSS/SCSS files and Vue SFCs
  '*.{css,scss,sass}': ['stylelint --fix', 'prettier --write'],
  '*.vue': ['stylelint --fix', 'prettier --write'],

  // Package.json files
  'package.json': ['sort-package-json', 'prettier --write'],

  // Configuration files
  '*.config.{js,ts}': ['eslint --fix --cache', 'prettier --write'],

  // Type checking for TypeScript files
  '*.{ts,tsx}': [() => 'tsc --noEmit'],
};
