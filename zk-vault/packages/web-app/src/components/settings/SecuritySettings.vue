<template>
  <div class="security-settings">
    <div class="settings-section">
      <h2 class="section-title">Security</h2>
      <div class="section-content">
        <div class="setting-group">
          <h3 class="group-title">Session Management</h3>
          <div class="preference-items">
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Auto-lock Timeout</h4>
                <p class="preference-description">Automatically lock the vault after a period of inactivity.</p>
              </div>
              <select v-model="settings.autoLockTimeout" class="preference-select">
                <option :value="5">5 minutes</option>
                <option :value="15">15 minutes</option>
                <option :value="30">30 minutes</option>
                <option :value="60">1 hour</option>
                <option :value="0">Never</option>
              </select>
            </div>
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Clipboard Auto-clear</h4>
                <p class="preference-description">Clear copied passwords from the clipboard automatically.</p>
              </div>
              <select v-model="settings.clipboardTimeout" class="preference-select">
                <option :value="30">30 seconds</option>
                <option :value="60">1 minute</option>
                <option :value="120">2 minutes</option>
                <option :value="300">5 minutes</option>
                <option :value="0">Never</option>
              </select>
            </div>
          </div>
        </div>
        <div class="setting-group">
          <h3 class="group-title">Device Security</h3>
           <div class="preference-items">
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Biometric Authentication</h4>
                <p class="preference-description">Use fingerprint or face recognition to unlock the vault.</p>
              </div>
              <label class="preference-toggle">
                <input v-model="settings.biometricEnabled" type="checkbox" class="toggle-input" :disabled="!biometricSupported" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="setting-group">
          <h3 class="group-title">Login Security</h3>
          <div class="preference-items">
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Failed Login Protection</h4>
                <p class="preference-description">Lock your account after multiple failed login attempts to prevent brute-force attacks.</p>
              </div>
              <label class="preference-toggle">
                <input v-model="settings.failedLoginProtection" type="checkbox" class="toggle-input" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="setting-actions">
            <BaseButton
              variant="primary"
              @click="saveSecuritySettings"
              :loading="isSaving"
              :disabled="!areSettingsChanged"
            >
              Save Changes
            </BaseButton>
          </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '@/store/settings.store';
import BaseButton from '@/components/common/BaseButton.vue';

const settingsStore = useSettingsStore();
const isSaving = ref(false);

const saveSecuritySettings = async () => {
  isSaving.value = true;
  await settingsStore.updateSettings(settingsStore.settings);
  isSaving.value = false;
};
</script>

<style scoped>
.security-settings {
  @apply space-y-8;
}

.settings-section {
  @apply bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden;
}

.section-title {
  @apply text-xl font-semibold text-neutral-900 p-6 border-b border-neutral-200;
}

.section-content {
  @apply p-6 space-y-8;
}

.setting-group {
  @apply space-y-6;
}

.group-title {
  @apply text-lg font-medium text-neutral-900;
}

.preference-items {
  @apply space-y-4;
}

.preference-item {
  @apply flex items-center justify-between p-4 bg-neutral-50 rounded-lg;
}

.preference-content {
  @apply flex-1;
}

.preference-title {
  @apply font-medium text-neutral-900 mb-1;
}

.preference-description {
  @apply text-sm text-neutral-600;
}

.preference-select {
  @apply px-3 py-2 border border-neutral-300 rounded-lg text-sm;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.preference-toggle {
  @apply relative inline-flex items-center cursor-pointer;
}

.toggle-input {
  @apply sr-only;
}

.toggle-slider {
  @apply w-11 h-6 bg-neutral-200 rounded-full relative transition-colors;
  @apply after:content-[''] after:absolute after:top-[2px] after:left-[2px];
  @apply after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform;
}

.toggle-input:checked + .toggle-slider {
  @apply bg-primary-600;
}

.toggle-input:checked + .toggle-slider:after {
  @apply translate-x-5;
}

.toggle-input:disabled + .toggle-slider {
  @apply opacity-50 cursor-not-allowed;
}

.setting-actions {
  @apply flex justify-start pt-2;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .settings-section {
    @apply bg-neutral-800 border-neutral-700;
  }

  .section-title,
  .group-title,
  .preference-title {
    @apply text-neutral-100;
  }

  .preference-description {
    @apply text-neutral-400;
  }
  
  .section-title {
      @apply border-neutral-700;
  }

  .preference-item {
    @apply bg-neutral-700;
  }

  .preference-select {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
  }

  .toggle-slider {
    @apply bg-neutral-600;
  }
}
</style> 