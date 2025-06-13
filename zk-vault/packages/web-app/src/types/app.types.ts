/**
 * @fileoverview Application-wide Type Definitions
 * @responsibility Core application types and interfaces
 */

/**
 * Application theme options
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * Supported languages
 */
export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko';

/**
 * Application environment
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Loading states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Application notification
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  actions?: NotificationAction[];
  timestamp: Date;
}

/**
 * Notification action
 */
export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * Application configuration
 */
export interface AppConfig {
  name: string;
  version: string;
  environment: Environment;
  apiUrl: string;
  features: {
    biometricAuth: boolean;
    offlineMode: boolean;
    darkMode: boolean;
    analytics: boolean;
    debugging: boolean;
  };
  limits: {
    maxFileSize: number;
    maxVaultItems: number;
    sessionTimeout: number;
    autoLockTimeout: number;
  };
}

/**
 * Application state
 */
export interface AppState {
  isInitialized: boolean;
  isOnline: boolean;
  theme: Theme;
  language: Language;
  notifications: AppNotification[];
  loading: {
    global: boolean;
    components: Record<string, boolean>;
  };
  errors: {
    global: Error | null;
    components: Record<string, Error | null>;
  };
  config: AppConfig;
}

/**
 * Route metadata
 */
export interface RouteMeta {
  title?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  requiresEmailVerification?: boolean;
  requiresPremium?: boolean;
  layout?: string;
  transition?: string;
  keepAlive?: boolean;
  permissions?: string[];
}

/**
 * Navigation item
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  href?: string;
  children?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
  hidden?: boolean;
  permissions?: string[];
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  route?: string;
  href?: string;
  disabled?: boolean;
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  id: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  persistent?: boolean;
  backdrop?: boolean;
  keyboard?: boolean;
  centered?: boolean;
  scrollable?: boolean;
  fullscreen?: boolean | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Toast configuration
 */
export interface ToastConfig {
  id?: string;
  type?: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dismissible?: boolean;
  actions?: NotificationAction[];
}

/**
 * Progress indicator
 */
export interface ProgressIndicator {
  id: string;
  label: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: string;
}

/**
 * Application metrics
 */
export interface AppMetrics {
  performance: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
  };
  usage: {
    sessionDuration: number;
    pageViews: number;
    interactions: number;
    errors: number;
  };
  features: {
    mostUsed: string[];
    leastUsed: string[];
    errorProne: string[];
  };
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
  timestamp: Date;
}

/**
 * Keyboard shortcut
 */
export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  enabled?: boolean;
  global?: boolean;
  preventDefault?: boolean;
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  shortcut?: string;
}

/**
 * Drag and drop data
 */
export interface DragDropData {
  type: string;
  data: any;
  source: string;
  target?: string;
  operation: 'copy' | 'move' | 'link';
}

/**
 * File drop event
 */
export interface FileDropEvent {
  files: File[];
  target: string;
  position: { x: number; y: number };
}

/**
 * Application event
 */
export interface AppEvent {
  type: string;
  data?: any;
  timestamp: Date;
  source: string;
  target?: string;
}

/**
 * Feature flag
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
}

/**
 * A/B test variant
 */
export interface ABTestVariant {
  name: string;
  weight: number;
  config: Record<string, any>;
}

/**
 * A/B test
 */
export interface ABTest {
  name: string;
  enabled: boolean;
  variants: ABTestVariant[];
  trafficAllocation: number;
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Performance entry
 */
export interface PerformanceEntry {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  details?: Record<string, any>;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

/**
 * Network information
 */
export interface NetworkInfo {
  online: boolean;
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Device information
 */
export interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  os: string;
  browser: string;
  version: string;
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  capabilities: {
    touch: boolean;
    webgl: boolean;
    webrtc: boolean;
    serviceWorker: boolean;
    webAssembly: boolean;
  };
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  startTime: Date;
  lastActivity: Date;
  duration: number;
  pageViews: number;
  interactions: number;
  device: DeviceInfo;
  network: NetworkInfo;
} 