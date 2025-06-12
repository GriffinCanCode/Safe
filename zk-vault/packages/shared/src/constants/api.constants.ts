/**
 * @fileoverview API Constants
 * @responsibility Defines API endpoints and configuration
 * @principle Single Responsibility - Only API constants
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    SRP_INIT: '/auth/srp/init',
    SRP_VERIFY: '/auth/srp/verify',
  },
  VAULT: {
    ITEMS: '/vault/items',
    FOLDERS: '/vault/folders',
    SEARCH: '/vault/search',
    SHARE: '/vault/share',
  },
  FILES: {
    UPLOAD: '/files/upload',
    DOWNLOAD: '/files/download',
    CHUNKS: '/files/chunks',
    MANIFEST: '/files/manifest',
  },
} as const;

export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;
