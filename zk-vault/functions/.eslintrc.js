module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./tsconfig.dev.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    "jest.config.js", // Ignore Jest config file.
    "node_modules/**/*", // Ignore node_modules
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "max-len": "off", // Disable line length rule
    "require-jsdoc": "off", // Disable JSDoc requirement
    "valid-jsdoc": "off", // Disable JSDoc validation
    "@typescript-eslint/no-explicit-any": "warn", // Change to warning
    "@typescript-eslint/no-unused-vars": "warn", // Change to warning
    "@typescript-eslint/no-non-null-assertion": "warn", // Change to warning
    "object-curly-spacing": ["error", "never"], // Google style
    "comma-dangle": ["error", "always-multiline"], // Google style
  },
};
