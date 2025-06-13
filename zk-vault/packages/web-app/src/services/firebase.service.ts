/**
 * @fileoverview Firebase Service
 * @description Centralized Firebase configuration and initialization
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, type Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, type Storage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, type Analytics } from 'firebase/analytics';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Firebase service class
class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp | null = null;
  private _auth: Auth | null = null;
  private _db: Firestore | null = null;
  private _functions: Functions | null = null;
  private _storage: Storage | null = null;
  private _analytics: Analytics | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Initialize Firebase with configuration
   */
  public initialize(config: FirebaseConfig): void {
    if (this.initialized) {
      console.warn('Firebase already initialized');
      return;
    }

    try {
      // Initialize Firebase app
      this.app = initializeApp(config);

      // Initialize services
      this._auth = getAuth(this.app);
      this._db = getFirestore(this.app);
      this._functions = getFunctions(this.app);
      this._storage = getStorage(this.app);

      // Initialize analytics in production
      if (import.meta.env.PROD && config.measurementId) {
        this._analytics = getAnalytics(this.app);
      }

      // Connect to emulators in development
      if (import.meta.env.DEV) {
        this.connectEmulators();
      }

      this.initialized = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  /**
   * Connect to Firebase emulators in development
   */
  private connectEmulators(): void {
    try {
      // Auth emulator
      if (this._auth && !this._auth.emulatorConfig) {
        connectAuthEmulator(this._auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
      }

      // Firestore emulator
      if (this._db && !this._db.app._delegate._config) {
        connectFirestoreEmulator(this._db, 'localhost', 8080);
      }

      // Functions emulator
      if (this._functions) {
        connectFunctionsEmulator(this._functions, 'localhost', 5001);
      }

      // Storage emulator
      if (this._storage) {
        connectStorageEmulator(this._storage, 'localhost', 9199);
      }

      console.log('Connected to Firebase emulators');
    } catch (error) {
      console.warn('Failed to connect to emulators:', error);
    }
  }

  /**
   * Get Firebase Auth instance
   */
  public get auth(): Auth {
    if (!this._auth) {
      throw new Error('Firebase Auth not initialized. Call initialize() first.');
    }
    return this._auth;
  }

  /**
   * Get Firestore instance
   */
  public get db(): Firestore {
    if (!this._db) {
      throw new Error('Firestore not initialized. Call initialize() first.');
    }
    return this._db;
  }

  /**
   * Get Functions instance
   */
  public get functions(): Functions {
    if (!this._functions) {
      throw new Error('Firebase Functions not initialized. Call initialize() first.');
    }
    return this._functions;
  }

  /**
   * Get Storage instance
   */
  public get storage(): Storage {
    if (!this._storage) {
      throw new Error('Firebase Storage not initialized. Call initialize() first.');
    }
    return this._storage;
  }

  /**
   * Get Analytics instance
   */
  public get analytics(): Analytics | null {
    return this._analytics;
  }

  /**
   * Get Firebase App instance
   */
  public get firebaseApp(): FirebaseApp {
    if (!this.app) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.app;
  }

  /**
   * Check if Firebase is initialized
   */
  public get isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const firebaseService = FirebaseService.getInstance();

// Export Firebase configuration from environment
export const getFirebaseConfig = (): FirebaseConfig => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
});

// Auto-initialize Firebase if config is available
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  firebaseService.initialize(getFirebaseConfig());
}
