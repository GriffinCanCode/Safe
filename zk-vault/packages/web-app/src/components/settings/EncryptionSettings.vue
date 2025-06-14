<template>
  <div class="encryption-settings">
    <div class="settings-section">
      <h2 class="section-title">Encryption Settings</h2>
      <div class="section-content">
        <!-- Encryption Overview -->
        <div class="setting-group">
          <h3 class="group-title">Vault Encryption</h3>
          <div class="info-card">
            <div class="info-icon">
              <svg class="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="info-content">
              <h4 class="info-title">Your vault is fully encrypted</h4>
              <p class="info-description">
                All your data is protected with end-to-end encryption using AES-256 and
                zero-knowledge architecture. Only you can decrypt your data with your master
                password.
              </p>
              <div class="encryption-details">
                <div class="detail-item">
                  <span class="detail-label">Encryption Algorithm:</span>
                  <span class="detail-value">AES-256-GCM</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Key Derivation:</span>
                  <span class="detail-value">PBKDF2 (100,000 iterations)</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Zero-Knowledge:</span>
                  <span class="detail-value">✓ Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Master Password -->
        <div class="setting-group">
          <h3 class="group-title">Master Password</h3>
          <div class="master-password-card">
            <div class="password-info">
              <h4 class="password-title">Change Master Password</h4>
              <p class="password-description">
                Your master password is the key to your vault. Choose a strong, unique password that
                you'll remember.
              </p>
            </div>

            <div class="password-form" v-if="showPasswordForm">
              <div class="form-grid">
                <BaseInput
                  v-model="passwordForm.currentPassword"
                  label="Current Master Password"
                  type="password"
                  placeholder="Enter your current master password"
                  :error="passwordErrors.currentPassword"
                  autocomplete="current-password"
                />

                <BaseInput
                  v-model="passwordForm.newPassword"
                  label="New Master Password"
                  type="password"
                  placeholder="Enter new master password"
                  :error="passwordErrors.newPassword"
                  autocomplete="new-password"
                />

                <BaseInput
                  v-model="passwordForm.confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new master password"
                  :error="passwordErrors.confirmPassword"
                  autocomplete="new-password"
                />
              </div>

              <!-- Password Strength Meter -->
              <PasswordStrengthMeter
                v-if="passwordForm.newPassword"
                :password="passwordForm.newPassword"
                class="mt-4"
              />

              <div class="warning-notice">
                <div class="warning-icon">
                  <svg class="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <div class="warning-content">
                  <p class="warning-text">
                    <strong>Warning:</strong> Changing your master password will re-encrypt all your
                    vault data. This process may take a few moments to complete.
                  </p>
                </div>
              </div>

              <div class="password-actions">
                <BaseButton variant="ghost" @click="cancelPasswordChange"> Cancel </BaseButton>
                <BaseButton
                  variant="primary"
                  @click="changeMasterPassword"
                  :loading="changingPassword"
                  :disabled="!isPasswordFormValid"
                >
                  Change Master Password
                </BaseButton>
              </div>
            </div>

            <div v-else class="password-actions">
              <BaseButton variant="outline" @click="showPasswordForm = true">
                Change Master Password
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Encryption Key Info -->
        <div class="setting-group">
          <h3 class="group-title">Encryption Keys</h3>
          <div class="key-info-card">
            <div class="key-status">
              <div class="status-indicator active">
                <span class="status-dot"></span>
                <span class="status-text">Active</span>
              </div>
              <div class="key-date">
                <span class="date-label">Key created:</span>
                <span class="date-value">{{ formatDate(keyCreatedDate) }}</span>
              </div>
            </div>

            <div class="key-actions">
              <BaseButton variant="outline" @click="rotateKeys" :loading="rotatingKeys">
                Rotate Encryption Keys
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import PasswordStrengthMeter from '@/components/vault/PasswordStrengthMeter.vue';
import { authService } from '@/services/auth.service';
import { cryptoVaultService } from '@/services/crypto-vault.service';

// State
const showPasswordForm = ref(false);
const changingPassword = ref(false);
const rotatingKeys = ref(false);
const keyCreatedDate = ref(new Date());

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const passwordErrors = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// Computed
const isPasswordFormValid = computed(() => {
  return (
    passwordForm.currentPassword &&
    passwordForm.newPassword &&
    passwordForm.confirmPassword &&
    passwordForm.newPassword === passwordForm.confirmPassword &&
    passwordForm.newPassword.length >= 12 &&
    !passwordErrors.currentPassword &&
    !passwordErrors.newPassword &&
    !passwordErrors.confirmPassword
  );
});

// Methods
const loadKeyData = async () => {
  try {
    const user = authService.getCurrentUser();
    if (!user) return;

    const profile = await authService.getUserProfile(user.uid);

    // Set key creation date (mock data for now)
    keyCreatedDate.value = profile.createdAt;
  } catch (error) {
    console.error('Failed to load key data:', error);
  }
};

const validatePasswordForm = () => {
  passwordErrors.currentPassword = '';
  passwordErrors.newPassword = '';
  passwordErrors.confirmPassword = '';

  if (!passwordForm.currentPassword) {
    passwordErrors.currentPassword = 'Current master password is required';
  }

  if (!passwordForm.newPassword) {
    passwordErrors.newPassword = 'New master password is required';
  } else if (passwordForm.newPassword.length < 12) {
    passwordErrors.newPassword = 'Master password must be at least 12 characters';
  } else if (passwordForm.newPassword === passwordForm.currentPassword) {
    passwordErrors.newPassword = 'New password must be different from current password';
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Please confirm your new master password';
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordErrors.confirmPassword = 'Passwords do not match';
  }

  return (
    !passwordErrors.currentPassword &&
    !passwordErrors.newPassword &&
    !passwordErrors.confirmPassword
  );
};

const changeMasterPassword = async () => {
  if (!validatePasswordForm()) return;

  changingPassword.value = true;

  try {
    // Verify current password first
    const isValid = await cryptoVaultService.initialize(
      passwordForm.currentPassword,
      authService.getCurrentUser()?.email || ''
    );
    if (!isValid) {
      passwordErrors.currentPassword = 'Current master password is incorrect';
      return;
    }

    // Update to new password
    await authService.updatePassword(passwordForm.newPassword);

    // Clear form and hide it
    cancelPasswordChange();

    // TODO: Show success notification
  } catch (error: any) {
    console.error('Failed to change master password:', error);
    passwordErrors.currentPassword = 'Failed to change master password';
    // TODO: Show error notification
  } finally {
    changingPassword.value = false;
  }
};

const cancelPasswordChange = () => {
  showPasswordForm.value = false;
  passwordForm.currentPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';

  // Clear errors
  passwordErrors.currentPassword = '';
  passwordErrors.newPassword = '';
  passwordErrors.confirmPassword = '';
};

const rotateKeys = async () => {
  if (
    !confirm(
      'Are you sure you want to rotate encryption keys? This will re-encrypt all your vault data.'
    )
  ) {
    return;
  }

  rotatingKeys.value = true;

  try {
    // In a real implementation, this would rotate the encryption keys
    // For now, we'll simulate the process
    await new Promise(resolve => setTimeout(resolve, 2000));

    keyCreatedDate.value = new Date();

    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to rotate keys:', error);
    // TODO: Show error notification
  } finally {
    rotatingKeys.value = false;
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Lifecycle
onMounted(() => {
  loadKeyData();
});
</script>

<!-- CSS classes are now defined in /styles/components/settings/encryption-settings.css -->
