/// <reference types="vite/client" />
/// <reference types="vue/macros-global" />

// Vue component types
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Vue global properties
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $router: import('vue-router').Router;
    $route: import('vue-router').RouteLocationNormalizedLoaded;
  }
  export interface GlobalComponents {}
}

// Vue composition API
declare module 'vue' {
  export function createApp(component: any): any;
  export function ref<T>(value: T): import('vue').Ref<T>;
  export function computed<T>(getter: () => T): import('vue').ComputedRef<T>;
  export function reactive<T extends object>(target: T): import('vue').UnwrapNestedRefs<T>;
  export function onMounted(hook: () => any): void;
  export function onUnmounted(hook: () => any): void;
  export function watch(source: any, callback: any, options?: any): any;
  export function nextTick(fn?: () => void): Promise<void>;
  export function defineProps<T = {}>(): T;
  export function defineEmits<T = {}>(): any;
  export function withDefaults<T, D>(props: T, defaults: D): T & D;
  export function defineExpose<T = {}>(exposed?: T): void;
}

// Vue Router types
declare module 'vue-router' {
  export function useRouter(): any;
  export function useRoute(): any;
  export function createRouter(options: any): any;
  export function createWebHistory(base?: string): any;
  export interface RouteRecordRaw {
    path: string;
    name?: string;
    component?: any;
    redirect?: string;
    meta?: any;
  }
}

// Pinia types
declare module 'pinia' {
  export function createPinia(): any;
  export function defineStore(id: string, setup: () => any): any;
}

// Firebase types
declare module 'firebase/app' {
  export interface FirebaseApp {
    _delegate?: {
      _config?: any;
    };
  }
}

declare module 'firebase/storage' {
  export interface Storage {}
  export function getStorage(app?: any): Storage;
  export function connectStorageEmulator(
    storage: Storage,
    host: string,
    port: number,
    options?: any
  ): void;
}

declare module 'firebase/auth' {
  export function getAuth(app?: any): any;
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
}

declare module 'firebase/functions' {
  export function getFunctions(app?: any): any;
}

declare module 'firebase/analytics' {
  export function getAnalytics(app?: any): any;
}

// Environment variables
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Web Workers
declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

// Global types for the app
declare global {
  interface Window {
    // Add any global window properties here
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: any;
  }

  // Test utilities
  var testUtils: {
    // Add test utility types here
  };

  // Web Crypto API
  interface Crypto {
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
    subtle: SubtleCrypto;
  }

  // Navigator extensions
  interface Navigator {
    credentials?: CredentialsContainer;
  }
}

// ZK-Vault package types
declare module '@zk-vault/shared' {
  export * from '../../../shared/src/index';
}

declare module '@zk-vault/crypto' {
  export * from '../../../crypto/src/index';
}

// Third-party library types
declare module 'fuse.js' {
  export default class Fuse<T> {
    constructor(list: T[], options?: any);
    search(pattern: string): any[];
  }
}

declare module 'comlink' {
  export function wrap<T>(endpoint: any): T;
  export function expose(obj: any, endpoint?: any): void;
  export function transfer(obj: any, transferables: Transferable[]): any;
}

declare module 'pako' {
  export function gzip(data: Uint8Array): Uint8Array;
  export function ungzip(data: Uint8Array): Uint8Array;
  export function deflate(data: Uint8Array): Uint8Array;
  export function inflate(data: Uint8Array): Uint8Array;
}

// CSS Modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Asset imports
declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}

export {};
