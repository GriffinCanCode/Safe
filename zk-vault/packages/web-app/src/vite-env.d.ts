/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Augment vue module to ensure exports are available
declare module 'vue' {
  export interface ComponentCustomProperties {}
  export interface GlobalComponents {}

  // Re-export commonly used functions to ensure they're available
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

// Vue Router module declaration
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

// Pinia module declaration
declare module 'pinia' {
  export function createPinia(): any;
  export function defineStore(id: string, setup: () => any): any;
}

// Firebase modules
declare module 'firebase/app' {
  export interface FirebaseApp {
    _delegate?: {
      _config?: any;
    };
  }
  export function initializeApp(config: any): FirebaseApp;
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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
