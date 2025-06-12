/**
 * @fileoverview Error Utilities
 * @responsibility Error handling and formatting functions
 * @principle Single Responsibility - Only error handling logic
 */

export class ZKVaultError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ZKVaultError';
  }
}

export function createError(code: string, message: string, details?: any): ZKVaultError {
  return new ZKVaultError(message, code, details);
}

export function isZKVaultError(error: any): error is ZKVaultError {
  return error instanceof ZKVaultError;
}
