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
                <p class="preference-description">
                  Automatically lock the vault after a period of inactivity.
                </p>
              </div>
              <select v-model="settings.value.autoLockTimeout" class="preference-select">
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
                <p class="preference-description">
                  Clear copied passwords from the clipboard automatically.
                </p>
              </div>
              <select v-model="settings.value.clipboardTimeout" class="preference-select">
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
                <p class="preference-description">
                  Use fingerprint or face recognition to unlock the vault.
                </p>
              </div>
              <label class="preference-toggle">
                <input
                  v-model="settings.value.biometricEnabled"
                  type="checkbox"
                  class="toggle-input"
                  :disabled="!biometricSupported"
                />
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
                <p class="preference-description">
                  Lock your account after multiple failed login attempts to prevent brute-force
                  attacks.
                </p>
              </div>
              <label class="preference-toggle">
                <input
                  v-model="settings.value.failedLoginProtection"
                  type="checkbox"
                  class="toggle-input"
                />
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
            :disabled="!areSettingsChanged.value"
          >
            Save Changes
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/store/settings.store';
import BaseButton from '@/components/common/BaseButton.vue';

const settingsStore = useSettingsStore();
const isSaving = ref(false);
const biometricSupported = ref(false); // This would be set based on device capabilities

// Use computed for reactive references
const settings = computed(() => settingsStore.settings);
const areSettingsChanged = computed(() => settingsStore.areSettingsChanged);

const saveSecuritySettings = async () => {
  isSaving.value = true;
  try {
    await settingsStore.updateSettings(settings.value);
  } catch (error: unknown) {
    console.error('Failed to save security settings:', error);
  } finally {
    isSaving.value = false;
  }
};
</script>

<!-- CSS classes are now defined in /styles/components/settings/security-settings.css -->
