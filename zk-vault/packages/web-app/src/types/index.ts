/**
 * @fileoverview Web App Type Definitions
 * @responsibility Central type exports for the web application
 */

// Re-export shared types
export * from '@zk-vault/shared';

// Re-export crypto types
export * from '@zk-vault/crypto';

// Web app specific types - export with explicit naming to avoid conflicts
export * from './components.types';
export * from './store.types';
export * from './worker.types';
export * from './firebase.types';

// Export app types with explicit naming to avoid DeviceInfo conflict
export type {
  Theme,
  Language,
  Environment,
  LoadingState,
  NotificationType,
  AppNotification,
  NotificationAction,
  AppConfig,
  AppState,
  RouteMeta,
  NavigationItem,
  BreadcrumbItem,
  ModalConfig,
  ToastConfig,
  ProgressIndicator,
  AppMetrics,
  ErrorBoundaryState,
  KeyboardShortcut,
  ContextMenuItem,
  DragDropData,
  FileDropEvent,
  AppEvent,
  FeatureFlag,
  ABTestVariant,
  ABTest,
  AnalyticsEvent,
  PerformanceEntry,
  MemoryUsage,
  NetworkInfo,
  SessionInfo,
} from './app.types';

// Re-export DeviceInfo from app.types with a different name to avoid conflict
export type { DeviceInfo as AppDeviceInfo } from './app.types';
