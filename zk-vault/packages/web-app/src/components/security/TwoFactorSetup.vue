<template>
  <div class="two-factor-setup">
    <!-- Header -->
    <div class="setup-header">
      <div class="header-content">
        <h2 class="setup-title">Two-Factor Authentication</h2>
        <p class="setup-description">Add an extra layer of security to your account</p>
      </div>
      <div v-if="twoFactorEnabled" class="header-status">
        <div class="status-indicator enabled">
          <svg class="status-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Enabled
        </div>
      </div>
    </div>

    <!-- Current Status -->
    <div class="current-status">
      <div class="status-card" :class="twoFactorEnabled ? 'enabled' : 'disabled'">
        <div class="status-icon" :class="twoFactorEnabled ? 'enabled' : 'disabled'">
          <svg class="status-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="twoFactorEnabled ? enabledIcon : disabledIcon" />
          </svg>
        </div>
        <div class="status-content">
          <h3 class="status-title">{{ twoFactorEnabled ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled' }}</h3>
          <p class="status-message">
            {{ twoFactorEnabled 
               ? 'Your account is protected with two-factor authentication.' 
               : 'Enable 2FA to add an extra layer of security to your account.' }}
          </p>
          <div v-if="twoFactorEnabled" class="status-details">
            <div class="detail-item">
              <span class="detail-label">Backup codes remaining:</span>
              <span class="detail-value">{{ backupCodesCount }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Enabled on:</span>
              <span class="detail-value">{{ formatDate(enabledDate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Setup Process -->
    <div v-if="!twoFactorEnabled" class="setup-steps">
      <!-- Step 1: Introduction -->
      <div v-if="currentStep === 'intro'" class="setup-step">
        <div class="step-header">
          <div class="step-number active">1</div>
          <h3 class="step-title">How Two-Factor Authentication Works</h3>
        </div>
        
        <div class="step-content">
          <p class="step-description">
            Two-factor authentication adds an extra layer of security to your account by requiring a second form of verification.
          </p>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-icon">
                <svg class="info-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="info-content">
                <h4 class="info-title">Install an Authenticator App</h4>
                <p class="info-description">Download an app like Google Authenticator, Authy, or 1Password on your phone.</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <svg class="info-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                </svg>
              </div>
              <div class="info-content">
                <h4 class="info-title">Scan QR Code</h4>
                <p class="info-description">Use your authenticator app to scan the QR code we'll provide.</p>
              </div>
            </div>

            <div class="info-item">
              <div class="info-icon">
                <svg class="info-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="info-content">
                <h4 class="info-title">Enter Verification Code</h4>
                <p class="info-description">Enter the 6-digit code from your app to complete setup.</p>
              </div>
            </div>
          </div>

          <div class="recommended-apps">
            <h4 class="apps-title">Recommended Authenticator Apps</h4>
            <div class="apps-list">
              <div class="app-item">
                <span class="app-name">Google Authenticator</span>
                <span class="app-platforms">iOS, Android</span>
              </div>
              <div class="app-item">
                <span class="app-name">Authy</span>
                <span class="app-platforms">iOS, Android, Desktop</span>
              </div>
              <div class="app-item">
                <span class="app-name">1Password</span>
                <span class="app-platforms">iOS, Android, Desktop</span>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <BaseButton
            variant="primary"
            size="lg"
            @click="nextStep"
          >
            Continue Setup
          </BaseButton>
        </div>
      </div>

      <!-- Step 2: QR Code -->
      <div v-if="currentStep === 'qr'" class="setup-step">
        <div class="step-header">
          <div class="step-number active">2</div>
          <h3 class="step-title">Scan QR Code</h3>
        </div>

        <div class="step-content">
          <p class="step-description">
            Scan the QR code below with your authenticator app to add your ZK-Vault account.
          </p>
          <div class="qr-code-section">
            <div class="qr-code-container">
              <div class="qr-code">
                <!-- QR Code would be generated here -->
                <div class="qr-placeholder">
                  <svg class="qr-placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                  </svg>
                  <p class="qr-text">QR Code</p>
                </div>
              </div>
            </div>
            <p class="qr-code-instructions">
              Open your authenticator app and scan this QR code to add your ZK-Vault account.
            </p>

            <div class="manual-entry">
              <h4 class="manual-title">Can't scan? Enter manually</h4>
              <div class="secret-key">
                <label class="secret-label">Secret Key:</label>
                <div class="secret-value">
                  <code class="secret-code">{{ secretKey }}</code>
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    @click="copySecretKey"
                    :class="{ 'copied': secretKeyCopied }"
                  >
                    {{ secretKeyCopied ? 'Copied!' : 'Copy' }}
                  </BaseButton>
                </div>
              </div>
              <p class="manual-instructions">
                Enter this secret key manually in your authenticator app if you can't scan the QR code.
              </p>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <BaseButton
            variant="outline"
            @click="previousStep"
          >
            Back
          </BaseButton>
          <BaseButton
            variant="primary"
            @click="nextStep"
          >
            I've Added the Account
          </BaseButton>
        </div>
      </div>

      <!-- Step 3: Verification -->
      <div v-if="currentStep === 'verify'" class="setup-step">
        <div class="step-header">
          <div class="step-number active">3</div>
          <h3 class="step-title">Verify Setup</h3>
        </div>

        <div class="step-content">
          <div class="verification-section">
            <p class="verification-instructions">
              Enter the 6-digit code from your authenticator app to complete the setup.
            </p>

            <div class="verification-form">
              <BaseInput
                v-model="verificationCode"
                label="Verification Code"
                placeholder="000000"
                type="text"
                maxlength="6"
                :error="verificationError"
                @keydown.enter="verifyCode"
              />
            </div>

            <div v-if="verificationError" class="error-message">
              <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {{ verificationError }}
            </div>
          </div>
        </div>

        <div class="step-actions">
          <BaseButton
            variant="outline"
            @click="previousStep"
          >
            Back
          </BaseButton>
          <BaseButton
            variant="primary"
            @click="verifyCode"
            :loading="verifying"
            :disabled="verificationCode.length !== 6"
          >
            Verify & Enable
          </BaseButton>
        </div>
      </div>

      <!-- Step 4: Backup Codes -->
      <div v-if="currentStep === 'backup'" class="setup-step">
        <div class="step-header">
          <div class="step-number completed">4</div>
          <h3 class="step-title">Save Your Backup Codes</h3>
        </div>

        <div class="step-content">
          <div class="backup-codes-section">
            <div class="backup-codes-warning">
              <svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div class="warning-content">
                <h4 class="warning-title">Important: Save These Backup Codes</h4>
                <p class="warning-message">
                  These codes can be used to access your account if you lose your authenticator device. 
                  Store them in a safe place - they won't be shown again.
                </p>
              </div>
            </div>

            <div class="backup-codes">
              <div class="backup-codes-grid">
                <div
                  v-for="(code, index) in backupCodes"
                  :key="index"
                  class="backup-code"
                >
                  {{ code }}
                </div>
              </div>
              
              <div class="backup-codes-actions">
                <BaseButton
                  variant="outline"
                  @click="downloadBackupCodes"
                >
                  Download Codes
                </BaseButton>
                <BaseButton
                  variant="outline"
                  @click="printBackupCodes"
                >
                  Print Codes
                </BaseButton>
                <BaseButton
                  variant="outline"
                  @click="copyBackupCodes"
                  :class="{ 'copied': backupCodesCopied }"
                >
                  {{ backupCodesCopied ? 'Copied!' : 'Copy All' }}
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <BaseButton
            variant="primary"
            size="lg"
            @click="completeSetup"
          >
            I've Saved My Backup Codes
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Management Section (when 2FA is enabled) -->
    <div v-if="twoFactorEnabled" class="management-section">
      <div class="management-grid">
        <!-- Backup Codes -->
        <div class="management-card">
          <div class="card-header">
            <h3 class="card-title">Backup Codes</h3>
            <span class="codes-remaining">{{ backupCodesCount }} remaining</span>
          </div>
          <p class="card-description">
            Use backup codes to access your account if you lose your authenticator device.
          </p>
          <div class="card-actions">
            <BaseButton
              variant="outline"
              size="sm"
              @click="showBackupCodes"
            >
              View Codes
            </BaseButton>
            <BaseButton
              variant="outline"
              size="sm"
              @click="regenerateBackupCodes"
              :loading="regenerating"
            >
              Regenerate
            </BaseButton>
          </div>
        </div>

        <!-- Test 2FA -->
        <div class="management-card">
          <div class="card-header">
            <h3 class="card-title">Test Authentication</h3>
          </div>
          <p class="card-description">
            Test your two-factor authentication to make sure it's working correctly.
          </p>
          <div class="card-actions">
            <BaseButton
              variant="outline"
              size="sm"
              @click="testTwoFactor"
              :loading="testing"
            >
              Test 2FA
            </BaseButton>
          </div>
        </div>

        <!-- Disable 2FA -->
        <div class="management-card danger">
          <div class="card-header">
            <h3 class="card-title">Disable Two-Factor Authentication</h3>
          </div>
          <p class="card-description">
            Remove two-factor authentication from your account. This will make your account less secure.
          </p>
          <div class="card-actions">
            <BaseButton
              variant="danger"
              size="sm"
              @click="showDisableModal = true"
            >
              Disable 2FA
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Backup Codes Modal -->
    <BaseModal
      v-model="showBackupModal"
      title="Backup Codes"
      size="md"
    >
      <div class="backup-modal-content">
        <p class="backup-modal-description">
          These backup codes can be used to access your account if you lose your authenticator device.
          Each code can only be used once.
        </p>
        
        <div class="backup-codes">
          <div class="codes-grid">
            <div
              v-for="(code, index) in backupCodes"
              :key="index"
              class="backup-code"
            >
              {{ code }}
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="outline"
          @click="showBackupModal = false"
        >
          Close
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="downloadBackupCodes"
        >
          Download
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Disable 2FA Modal -->
    <BaseModal
      v-model="showDisableModal"
      title="Disable Two-Factor Authentication"
      size="md"
    >
      <div class="disable-modal-content">
        <div class="disable-warning">
          <svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div class="warning-content">
            <h3 class="warning-title">Are you sure?</h3>
            <p class="warning-message">
              Disabling two-factor authentication will make your account less secure. 
              You'll only need your password to sign in.
            </p>
          </div>
        </div>

        <div class="disable-form">
          <BaseInput
            v-model="disableVerificationCode"
            label="Enter a code from your authenticator app to confirm"
            placeholder="000000"
            type="text"
            maxlength="6"
            :error="disableError"
          />
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="outline"
          @click="showDisableModal = false"
        >
          Cancel
        </BaseButton>
        <BaseButton
          variant="danger"
          @click="disableTwoFactor"
          :loading="disabling"
          :disabled="disableVerificationCode.length !== 6"
        >
          Disable 2FA
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Test 2FA Modal -->
    <BaseModal
      v-model="showTestModal"
      title="Test Two-Factor Authentication"
      size="md"
    >
      <div class="test-modal-content">
        <p class="test-description">
          Enter a code from your authenticator app to test that two-factor authentication is working correctly.
        </p>
        
        <div class="test-form">
          <BaseInput
            v-model="testVerificationCode"
            label="Verification Code"
            placeholder="000000"
            type="text"
            maxlength="6"
            :error="testError"
          />
        </div>

        <div v-if="testSuccess" class="test-success">
          <svg class="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Two-factor authentication is working correctly!
        </div>
      </div>

      <template #footer>
        <BaseButton
          variant="outline"
          @click="showTestModal = false"
        >
          Close
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="verifyTestCode"
          :loading="testing"
          :disabled="testVerificationCode.length !== 6"
        >
          Test Code
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { useAuthStore } from '@/store/auth.store'

type SetupStep = 'intro' | 'qr' | 'verify' | 'backup'

const emit = defineEmits<{
  'setup-complete': []
  'setup-cancelled': []
  'disabled': []
}>()

// Store
const authStore = useAuthStore()

// State
const currentStep = ref<SetupStep>('intro')
const verificationCode = ref('')
const verificationError = ref('')
const verifying = ref(false)
const secretKey = ref('JBSWY3DPEHPK3PXP')
const secretKeyCopied = ref(false)
const backupCodes = ref<string[]>([])
const backupCodesCopied = ref(false)

// Management state
const showBackupModal = ref(false)
const showDisableModal = ref(false)
const showTestModal = ref(false)
const regenerating = ref(false)
const testing = ref(false)
const disabling = ref(false)
const disableVerificationCode = ref('')
const disableError = ref('')
const testVerificationCode = ref('')
const testError = ref('')
const testSuccess = ref(false)

// Computed
const twoFactorEnabled = computed(() => 
  authStore.profile?.security.twoFactorEnabled ?? false
)

const backupCodesCount = computed(() => 
  authStore.profile?.security.backupCodesCount ?? 0
)

const enabledDate = computed(() => 
  authStore.profile?.security.lastPasswordChange ?? new Date()
)

const enabledIcon = 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'

const disabledIcon = 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'

// Methods
const nextStep = () => {
  switch (currentStep.value) {
    case 'intro':
      currentStep.value = 'qr'
      generateSecretKey()
      break
    case 'qr':
      currentStep.value = 'verify'
      break
    case 'verify':
      // Verification happens in verifyCode method
      break
  }
}

const previousStep = () => {
  switch (currentStep.value) {
    case 'qr':
      currentStep.value = 'intro'
      break
    case 'verify':
      currentStep.value = 'qr'
      break
    case 'backup':
      currentStep.value = 'verify'
      break
  }
}

const generateSecretKey = () => {
  // In real app, this would generate a proper TOTP secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  secretKey.value = result
}

const copySecretKey = async () => {
  try {
    await navigator.clipboard.writeText(secretKey.value)
    secretKeyCopied.value = true
    setTimeout(() => {
      secretKeyCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy secret key:', error)
  }
}

const verifyCode = async () => {
  if (verificationCode.value.length !== 6) {
    verificationError.value = 'Please enter a 6-digit code'
    return
  }

  verifying.value = true
  verificationError.value = ''

  try {
    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // For demo, accept any 6-digit code except '000000'
    if (verificationCode.value === '000000') {
      verificationError.value = 'Invalid verification code. Please try again.'
      return
    }

    // Generate backup codes
    generateBackupCodes()
    
    // Move to backup codes step
    currentStep.value = 'backup'
  } catch (error) {
    verificationError.value = 'Verification failed. Please try again.'
  } finally {
    verifying.value = false
  }
}

const generateBackupCodes = () => {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    codes.push(code)
  }
  backupCodes.value = codes
}

const copyBackupCodes = async () => {
  try {
    const codesText = backupCodes.value.join('\n')
    await navigator.clipboard.writeText(codesText)
    backupCodesCopied.value = true
    setTimeout(() => {
      backupCodesCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy backup codes:', error)
  }
}

const downloadBackupCodes = () => {
  const codesText = backupCodes.value.join('\n')
  const blob = new Blob([codesText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'zk-vault-backup-codes.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const printBackupCodes = () => {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>ZK-Vault Backup Codes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
            .code { padding: 10px; border: 1px solid #ddd; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>ZK-Vault Two-Factor Authentication Backup Codes</h1>
          <p>Store these codes in a safe place. Each code can only be used once.</p>
          <div class="codes">
                         ${backupCodes.value.map((code: string) => `<div class="code">${code}</div>`).join('')}
          </div>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}

const completeSetup = async () => {
  try {
    // Enable 2FA in the auth store
    await authStore.enable2FA()
    emit('setup-complete')
  } catch (error) {
    console.error('Failed to complete 2FA setup:', error)
  }
}

const showBackupCodes = () => {
  // In real app, would require authentication to view backup codes
  showBackupModal.value = true
}

const regenerateBackupCodes = async () => {
  regenerating.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    generateBackupCodes()
  } catch (error) {
    console.error('Failed to regenerate backup codes:', error)
  } finally {
    regenerating.value = false
  }
}

const testTwoFactor = () => {
  testSuccess.value = false
  testError.value = ''
  testVerificationCode.value = ''
  showTestModal.value = true
}

const verifyTestCode = async () => {
  if (testVerificationCode.value.length !== 6) {
    testError.value = 'Please enter a 6-digit code'
    return
  }

  testing.value = true
  testError.value = ''
  testSuccess.value = false

  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (testVerificationCode.value === '000000') {
      testError.value = 'Invalid verification code'
      return
    }

    testSuccess.value = true
  } catch (error) {
    testError.value = 'Verification failed'
  } finally {
    testing.value = false
  }
}

const disableTwoFactor = async () => {
  if (disableVerificationCode.value.length !== 6) {
    disableError.value = 'Please enter a 6-digit code'
    return
  }

  disabling.value = true
  disableError.value = ''

  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (disableVerificationCode.value === '000000') {
      disableError.value = 'Invalid verification code'
      return
    }

    // Disable 2FA in the auth store
    await authStore.disable2FA()
    showDisableModal.value = false
    emit('disabled')
  } catch (error) {
    disableError.value = 'Failed to disable two-factor authentication'
  } finally {
    disabling.value = false
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Lifecycle
onMounted(() => {
  if (twoFactorEnabled.value) {
    generateBackupCodes() // Load existing backup codes
  }
})
</script>

<style scoped>
/* Component styles are handled by /src/styles/components/security/two-factor-setup.css */
</style>
