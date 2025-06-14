<template>
  <div class="appearance-settings">
    <div class="settings-section">
      <h2 class="section-title">Appearance</h2>
      <div class="section-content">
        <div class="setting-group">
          <h3 class="group-title">Theme & Language</h3>
          <p class="group-description">Customize the look and feel of the application.</p>
          <div class="preference-items">
            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Theme</h4>
                <p class="preference-description">
                  Choose your preferred theme for the application.
                </p>
              </div>
              <select v-model="settingsStore.settings.theme" class="preference-select">
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div class="preference-item">
              <div class="preference-content">
                <h4 class="preference-title">Language</h4>
                <p class="preference-description">Select your display language.</p>
              </div>
              <select v-model="settingsStore.settings.language" class="preference-select">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>

        <div class="setting-actions">
          <BaseButton
            variant="primary"
            @click="saveAppearanceSettings"
            :loading="isSaving"
            :disabled="!settingsStore.areSettingsChanged"
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

const saveAppearanceSettings = async () => {
  isSaving.value = true;
  await settingsStore.updateSettings(settingsStore.settings);
  isSaving.value = false;
};
</script>

<!-- CSS classes are now defined in /styles/components/settings/appearance-settings.css -->
