/**
 * @fileoverview Firebase Type Definitions
 * @responsibility Types for Firebase services and configuration
 */

/**
 * Firebase configuration
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Firebase app instance
 */
export interface FirebaseApp {
  name: string;
  options: FirebaseConfig;
  automaticDataCollectionEnabled: boolean;
}

/**
 * Firebase auth user
 */
export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: FirebaseUserInfo[];
  metadata: FirebaseUserMetadata;
  refreshToken: string;
  accessToken?: string;
}

/**
 * Firebase user info
 */
export interface FirebaseUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  providerId: string;
}

/**
 * Firebase user metadata
 */
export interface FirebaseUserMetadata {
  creationTime?: string;
  lastSignInTime?: string;
}

/**
 * Firebase auth credentials
 */
export interface FirebaseAuthCredential {
  providerId: string;
  signInMethod: string;
  toJSON(): object;
}

/**
 * Firebase auth error
 */
export interface FirebaseAuthError extends Error {
  code: string;
  message: string;
  customData?: Record<string, any>;
}

/**
 * Firebase auth state change
 */
export type FirebaseAuthStateChange = (user: FirebaseUser | null) => void;

/**
 * Firebase ID token result
 */
export interface FirebaseIdTokenResult {
  token: string;
  expirationTime: string;
  authTime: string;
  issuedAtTime: string;
  signInProvider: string | null;
  signInSecondFactor: string | null;
  claims: Record<string, any>;
}

/**
 * Firebase custom token
 */
export interface FirebaseCustomToken {
  token: string;
  uid: string;
  claims?: Record<string, any>;
}

/**
 * Firestore document data
 */
export interface FirestoreDocumentData {
  [field: string]: any;
}

/**
 * Firestore document reference
 */
export interface FirestoreDocumentReference {
  id: string;
  path: string;
  parent: FirestoreCollectionReference;
  firestore: FirestoreDatabase;
}

/**
 * Firestore collection reference
 */
export interface FirestoreCollectionReference {
  id: string;
  path: string;
  parent: FirestoreDocumentReference | null;
  firestore: FirestoreDatabase;
}

/**
 * Firestore database
 */
export interface FirestoreDatabase {
  app: FirebaseApp;
  type: 'firestore-lite' | 'firestore';
}

/**
 * Firestore document snapshot
 */
export interface FirestoreDocumentSnapshot {
  id: string;
  ref: FirestoreDocumentReference;
  exists: boolean;
  data(): FirestoreDocumentData | undefined;
  get(fieldPath: string): any;
  metadata: FirestoreSnapshotMetadata;
}

/**
 * Firestore query snapshot
 */
export interface FirestoreQuerySnapshot {
  docs: FirestoreDocumentSnapshot[];
  empty: boolean;
  size: number;
  metadata: FirestoreSnapshotMetadata;
  forEach(callback: (doc: FirestoreDocumentSnapshot) => void): void;
}

/**
 * Firestore snapshot metadata
 */
export interface FirestoreSnapshotMetadata {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

/**
 * Firestore query
 */
export interface FirestoreQuery {
  firestore: FirestoreDatabase;
  where(field: string, operator: FirestoreWhereFilterOp, value: any): FirestoreQuery;
  orderBy(field: string, direction?: 'asc' | 'desc'): FirestoreQuery;
  limit(limit: number): FirestoreQuery;
  limitToLast(limit: number): FirestoreQuery;
  startAt(...fieldValues: any[]): FirestoreQuery;
  startAfter(...fieldValues: any[]): FirestoreQuery;
  endAt(...fieldValues: any[]): FirestoreQuery;
  endBefore(...fieldValues: any[]): FirestoreQuery;
}

/**
 * Firestore where filter operator
 */
export type FirestoreWhereFilterOp = 
  | '<' | '<=' | '==' | '!=' | '>=' | '>'
  | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';

/**
 * Firestore batch
 */
export interface FirestoreBatch {
  set(documentRef: FirestoreDocumentReference, data: FirestoreDocumentData): FirestoreBatch;
  update(documentRef: FirestoreDocumentReference, data: Partial<FirestoreDocumentData>): FirestoreBatch;
  delete(documentRef: FirestoreDocumentReference): FirestoreBatch;
  commit(): Promise<void>;
}

/**
 * Firestore transaction
 */
export interface FirestoreTransaction {
  get(documentRef: FirestoreDocumentReference): Promise<FirestoreDocumentSnapshot>;
  set(documentRef: FirestoreDocumentReference, data: FirestoreDocumentData): FirestoreTransaction;
  update(documentRef: FirestoreDocumentReference, data: Partial<FirestoreDocumentData>): FirestoreTransaction;
  delete(documentRef: FirestoreDocumentReference): FirestoreTransaction;
}

/**
 * Firebase Storage reference
 */
export interface FirebaseStorageReference {
  bucket: string;
  fullPath: string;
  name: string;
  parent: FirebaseStorageReference | null;
  root: FirebaseStorageReference;
  storage: FirebaseStorage;
}

/**
 * Firebase Storage
 */
export interface FirebaseStorage {
  app: FirebaseApp;
  maxOperationRetryTime: number;
  maxUploadRetryTime: number;
}

/**
 * Firebase Storage upload task
 */
export interface FirebaseStorageUploadTask {
  snapshot: FirebaseStorageTaskSnapshot;
  cancel(): boolean;
  catch(onRejected: (error: FirebaseStorageError) => any): Promise<any>;
  pause(): boolean;
  resume(): boolean;
  then(onFulfilled?: (snapshot: FirebaseStorageTaskSnapshot) => any, onRejected?: (error: FirebaseStorageError) => any): Promise<any>;
  on(event: string, nextOrObserver?: any, error?: (error: FirebaseStorageError) => any, complete?: () => any): Function;
}

/**
 * Firebase Storage task snapshot
 */
export interface FirebaseStorageTaskSnapshot {
  bytesTransferred: number;
  metadata: FirebaseStorageMetadata;
  ref: FirebaseStorageReference;
  state: 'canceled' | 'error' | 'paused' | 'running' | 'success';
  task: FirebaseStorageUploadTask;
  totalBytes: number;
}

/**
 * Firebase Storage metadata
 */
export interface FirebaseStorageMetadata {
  bucket: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
  fullPath: string;
  generation: string;
  md5Hash?: string;
  metageneration: string;
  name: string;
  size: number;
  timeCreated: string;
  updated: string;
}

/**
 * Firebase Storage error
 */
export interface FirebaseStorageError extends Error {
  code: string;
  message: string;
  serverResponse: string | null;
}

/**
 * Firebase Functions callable
 */
export interface FirebaseFunctionsCallable {
  (data?: any): Promise<FirebaseFunctionsCallableResult>;
}

/**
 * Firebase Functions callable result
 */
export interface FirebaseFunctionsCallableResult {
  data: any;
}

/**
 * Firebase Functions error
 */
export interface FirebaseFunctionsError extends Error {
  code: string;
  message: string;
  details?: any;
}

/**
 * Firebase Analytics
 */
export interface FirebaseAnalytics {
  app: FirebaseApp;
}

/**
 * Firebase Analytics event parameters
 */
export interface FirebaseAnalyticsEventParams {
  [key: string]: any;
}

/**
 * Firebase Performance
 */
export interface FirebasePerformance {
  app: FirebaseApp;
  dataCollectionEnabled: boolean;
  instrumentationEnabled: boolean;
}

/**
 * Firebase Performance trace
 */
export interface FirebasePerformanceTrace {
  start(): void;
  stop(): void;
  incrementMetric(metricName: string, incrementBy?: number): void;
  putMetric(metricName: string, value: number): void;
  getMetric(metricName: string): number;
  putAttribute(attributeName: string, attributeValue: string): void;
  getAttribute(attributeName: string): string | undefined;
  removeAttribute(attributeName: string): void;
  getAttributes(): Record<string, string>;
}

/**
 * Firebase Remote Config
 */
export interface FirebaseRemoteConfig {
  app: FirebaseApp;
  defaultConfig: Record<string, string | number | boolean>;
  fetchTimeMillis: number;
  lastFetchStatus: 'no-fetch-yet' | 'success' | 'failure' | 'throttle';
  settings: FirebaseRemoteConfigSettings;
}

/**
 * Firebase Remote Config settings
 */
export interface FirebaseRemoteConfigSettings {
  fetchTimeoutMillis: number;
  minimumFetchIntervalMillis: number;
}

/**
 * Firebase Remote Config value
 */
export interface FirebaseRemoteConfigValue {
  asBoolean(): boolean;
  asNumber(): number;
  asString(): string;
  getSource(): 'static' | 'default' | 'remote';
}

/**
 * Firebase Messaging
 */
export interface FirebaseMessaging {
  app: FirebaseApp;
}

/**
 * Firebase Messaging payload
 */
export interface FirebaseMessagingPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    image?: string;
    badge?: string;
    sound?: string;
    tag?: string;
    data?: Record<string, string>;
  };
  data?: Record<string, string>;
  fcmOptions?: {
    link?: string;
    analyticsLabel?: string;
  };
}

/**
 * Firebase App Check
 */
export interface FirebaseAppCheck {
  app: FirebaseApp;
  isTokenAutoRefreshEnabled: boolean;
}

/**
 * Firebase App Check token
 */
export interface FirebaseAppCheckToken {
  token: string;
  expireTimeMillis: number;
}

/**
 * Firebase emulator configuration
 */
export interface FirebaseEmulatorConfig {
  auth?: {
    host: string;
    port: number;
  };
  firestore?: {
    host: string;
    port: number;
  };
  storage?: {
    host: string;
    port: number;
  };
  functions?: {
    host: string;
    port: number;
  };
  database?: {
    host: string;
    port: number;
  };
}

/**
 * Firebase service configuration
 */
export interface FirebaseServiceConfig {
  emulators?: FirebaseEmulatorConfig;
  persistence?: boolean;
  cacheSizeBytes?: number;
  experimentalForceLongPolling?: boolean;
  experimentalAutoDetectLongPolling?: boolean;
  ignoreUndefinedProperties?: boolean;
} 