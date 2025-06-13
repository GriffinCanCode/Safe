import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: '/',
  }),
}));

// Mock Pinia
vi.mock('pinia', () => ({
  createPinia: vi.fn(),
  defineStore: vi.fn(),
}));

// Global test utils
global.testUtils = {
  // Add common test utilities here
};