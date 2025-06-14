<template>
  <MainLayout>
    <div class="security-view">
      <!-- Header -->
      <div class="security-header">
        <div class="header-content">
          <h1 class="page-title">Security Center</h1>
          <p class="page-description">Monitor and manage your vault security</p>
        </div>
        <div class="header-actions">
          <BaseButton
            variant="outline"
            size="sm"
            @click="refreshSecurityData"
            :loading="refreshing"
          >
            Refresh
          </BaseButton>
        </div>
      </div>

      <!-- Security Dashboard -->
      <div class="security-content">
        <SecurityDashboard
          :total-passwords="securityStats.totalPasswords"
          :weak-passwords="securityStats.weakPasswords"
          :breached-passwords="securityStats.breachedPasswords"
          @view-weak-passwords="showWeakPasswords"
          @view-breached-passwords="showBreachedPasswords"
          @setup-2fa="show2FASetup"
          @setup-biometric="showBiometricSetup"
          @view-audit-log="showAuditLog"
        />

        <!-- Tabbed Content -->
        <div class="security-tabs">
          <div class="tab-navigation">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-button"
              :class="{ 'tab-active': activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="tab.icon"
                />
              </svg>
              {{ tab.label }}
            </button>
          </div>

          <div class="tab-content">
            <!-- Breach Monitor Tab -->
            <div v-if="activeTab === 'breaches'" class="tab-panel">
              <BreachMonitor
                :total-passwords="securityStats.totalPasswords"
                @password-fixed="handlePasswordFixed"
                @scan-complete="handleScanComplete"
              />
            </div>

            <!-- Two-Factor Authentication Tab -->
            <div v-if="activeTab === '2fa'" class="tab-panel">
              <TwoFactorSetup
                @setup-complete="handle2FASetupComplete"
                @setup-cancelled="handle2FASetupCancelled"
                @disabled="handle2FADisabled"
              />
            </div>

            <!-- Audit Log Tab -->
            <div v-if="activeTab === 'audit'" class="tab-panel">
              <AuditLog />
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import SecurityDashboard from '@/components/security/SecurityDashboard.vue';
import BreachMonitor from '@/components/security/BreachMonitor.vue';
import TwoFactorSetup from '@/components/security/TwoFactorSetup.vue';
import AuditLog from '@/components/security/AuditLog.vue';
import { useAuthStore } from '@/store/auth.store';

interface SecurityStats {
  totalPasswords: number;
  weakPasswords: number;
  breachedPasswords: number;
}

interface Tab {
  id: string;
  label: string;
  icon: string;
}

// Store
const authStore = useAuthStore();

// State
const refreshing = ref(false);
const activeTab = ref('breaches');

const securityStats = reactive<SecurityStats>({
  totalPasswords: 0,
  weakPasswords: 0,
  breachedPasswords: 0,
});

const tabs: Tab[] = [
  {
    id: 'breaches',
    label: 'Breach Monitor',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  {
    id: '2fa',
    label: 'Two-Factor Auth',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

// Methods
const loadSecurityStats = async () => {
  try {
    // In a real app, this would fetch from the vault service
    // For now, using mock data
    securityStats.totalPasswords = 25;
    securityStats.weakPasswords = 3;
    securityStats.breachedPasswords = 2;
  } catch (error) {
    console.error('Failed to load security stats:', error);
  }
};

const refreshSecurityData = async () => {
  refreshing.value = true;

  try {
    await loadSecurityStats();
    // Refresh auth profile
    await authStore.refreshProfile();
  } catch (error) {
    console.error('Failed to refresh security data:', error);
  } finally {
    refreshing.value = false;
  }
};

const showWeakPasswords = () => {
  // Navigate to vault with weak password filter
  // For now, just switch to breach monitor tab
  activeTab.value = 'breaches';
};

const showBreachedPasswords = () => {
  // Navigate to vault with breached password filter
  activeTab.value = 'breaches';
};

const show2FASetup = () => {
  activeTab.value = '2fa';
};

const showBiometricSetup = () => {
  // In a real app, this would open biometric setup
  console.log('Show biometric setup');
};

const showAuditLog = () => {
  activeTab.value = 'audit';
};

const handlePasswordFixed = (passwordId: string) => {
  // Update security stats when a password is fixed
  securityStats.breachedPasswords = Math.max(0, securityStats.breachedPasswords - 1);
  console.log('Password fixed:', passwordId);
};

const handleScanComplete = (results: any) => {
  // Update security stats after scan
  console.log('Scan complete:', results);
};

const handle2FASetupComplete = () => {
  // Refresh security data after 2FA setup
  refreshSecurityData();
  console.log('2FA setup completed');
};

const handle2FASetupCancelled = () => {
  console.log('2FA setup cancelled');
};

const handle2FADisabled = () => {
  // Refresh security data after 2FA disabled
  refreshSecurityData();
  console.log('2FA disabled');
};

// Lifecycle
onMounted(() => {
  loadSecurityStats();
});
</script>

<!-- Styles handled by /src/styles/components/security/security-view.css -->
