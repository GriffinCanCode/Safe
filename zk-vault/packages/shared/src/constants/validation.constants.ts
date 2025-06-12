/**
 * @fileoverview Validation Constants
 * @responsibility Defines validation rules and constraints
 * @principle Single Responsibility - Only validation constants
 */

export const VALIDATION_RULES = {
  EMAIL: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 254,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
  },
  VAULT_ITEM: {
    TITLE_MAX_LENGTH: 255,
    NOTES_MAX_LENGTH: 10000,
    URL_MAX_LENGTH: 2048,
    USERNAME_MAX_LENGTH: 255,
  },
} as const;
