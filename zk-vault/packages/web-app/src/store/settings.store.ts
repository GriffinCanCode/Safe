import { defineStore } from 'pinia';
import { ref, reactive, watch, computed } from 'vue';

export type Theme = 'auto' | 'light' | 'dark';
export type Language = 'en' | 'es' | 'fr' | 'de';
export type AutoBackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface SettingsState {
  theme: Theme;
  language: Language;
  autoLockTimeout: number; // in minutes, 0 for never
  clipboardTimeout: number; // in seconds, 0 for never
  notifications: {
    security: boolean;
    updates: boolean;
  };
  biometricEnabled: boolean;
  failedLoginProtection: boolean;
  autoBackup: {
    enabled: boolean;
    frequency: AutoBackupFrequency;
    retention: number; // number of backups to keep, 0 for all
  };
}

const SETTINGS_STORAGE_KEY = 'zk-vault-settings';

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = reactive<SettingsState>({
    theme: 'auto',
    language: 'en',
    autoLockTimeout: 15,
    clipboardTimeout: 60,
    notifications: {
      security: true,
      updates: true,
    },
    biometricEnabled: false,
    failedLoginProtection: true,
    autoBackup: {
      enabled: true,
      frequency: 'weekly',
      retention: 10,
    },
  });

  const originalSettings = ref<SettingsState | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  // Getter for checking if biometric is supported (placeholder)
  const biometricSupported = ref(false);

  // Getters
  const areSettingsChanged = computed(() => {
    if (!originalSettings.value) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings.value);
  });

  // Actions
  async function loadSettings() {
    loading.value = true;
    error.value = null;
    try {
      // In a real app, this would fetch from a service (e.g., authService.getUserProfile)
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        Object.assign(settings, JSON.parse(storedSettings));
      }
      originalSettings.value = JSON.parse(JSON.stringify(settings));
      
      // Simulate checking for biometric support
      // biometricSupported.value = await authService.isBiometricAvailable();
      biometricSupported.value = 'credentials' in navigator && typeof (navigator.credentials as any).create === 'function';

    } catch (e) {
      error.value = 'Failed to load settings.';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(newSettings: Partial<SettingsState>) {
    loading.value = true;
    error.value = null;
    try {
      // In a real app, this would be an API call
      // await authService.updateUserProfile(uid, { preferences: newSettings });
      
      Object.assign(settings, newSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      originalSettings.value = JSON.parse(JSON.stringify(settings));

    } catch (e) {
      error.value = 'Failed to update settings.';
      console.error(e);
      // Optionally revert changes
    } finally {
      loading.value = false;
    }
  }

  // Update a single setting
  function setSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    (settings as any)[key] = value;
  }

  // Watch for settings changes and persist them
  watch(
    () => settings,
    (newSettings: SettingsState) => {
      // only auto-save if not initialized yet.
      if (originalSettings.value) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      }
    },
    { deep: true }
  );
  
  // Apply theme to the document
  watch(
    () => settings.theme,
    (theme: Theme) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(prefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }
    },
    { immediate: true }
  );

  return {
    settings,
    loading,
    error,
    biometricSupported,
    areSettingsChanged,
    loadSettings,
    updateSettings,
    setSetting,
  };
});
