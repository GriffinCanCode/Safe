/**
 * @fileoverview Validation Utilities
 * @responsibility Input validation and sanitization functions
 * @principle Single Responsibility - Only validation logic
 */

import { VALIDATION_RULES } from '../constants/validation.constants';

export function validateEmail(email: string): boolean {
  if (!email || email.length < VALIDATION_RULES.EMAIL.MIN_LENGTH) {
    return false;
  }
  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    return false;
  }
  return VALIDATION_RULES.EMAIL.PATTERN.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`);
  }

  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    errors.push(`Password must be no more than ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`);
  }

  return { valid: errors.length === 0, errors };
}
