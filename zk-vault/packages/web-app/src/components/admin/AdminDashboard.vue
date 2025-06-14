<template>
  <div class="admin-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">ZK-Vault Admin Dashboard</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="refreshAllData" :disabled="isLoading">
          {{ isLoading ? 'Refreshing...' : 'Refresh Data' }}
        </button>
        <select v-model="selectedTimeRange" @change="onTimeRangeChange" class="time-range-selector">
          <option value="24">Last 24 Hours</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
    </div>

    <!-- System Health Alert -->
    <div v-if="systemHealth?.status !== 'healthy'" class="alert" :class="alertClass">
      <div class="alert-content">
        <h3>System Status: {{ systemHealth?.status?.toUpperCase() }}</h3>
        <p>{{ getSystemStatusMessage() }}</p>
        <button @click="runHealthCheck" class="btn btn-sm">Run Health Check</button>
      </div>
    </div>

    <!-- Key Metrics Grid -->
    <div class="metrics-grid">
      <MetricCard
        title="Total Users"
        :value="userAnalytics?.totalUsers || 0"
        icon="👥"
        :trend="userAnalytics?.userGrowthRate"
        format="number"
      />
      <MetricCard
        title="Active Users"
        :value="userAnalytics?.activeUsers || 0"
        icon="🟢"
        :subtitle="`${selectedTimeRange} days`"
        format="number"
      />
      <MetricCard
        title="New Users"
        :value="userAnalytics?.newUsersThisMonth || 0"
        icon="🆕"
        :trend="userAnalytics?.userGrowthRate"
        format="number"
      />
      <MetricCard
        title="Storage Used"
        :value="userAnalytics?.storageUsage?.totalSize || 0"
        icon="💾"
        :subtitle="`${userAnalytics?.storageUsage?.totalFiles || 0} files`"
        format="bytes"
      />
      <MetricCard
        title="Avg Session Duration"
        :value="userAnalytics?.averageSessionDuration || 0"
        icon="⏱️"
        format="duration"
      />
      <MetricCard
        title="System Uptime"
        :value="systemHealth?.uptime || 0"
        icon="⚡"
        format="uptime"
      />
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-container">
        <h3>User Activity Trends</h3>
        <ActivityChart :data="activityTrends" :loading="chartsLoading" />
      </div>
      <div class="chart-container">
        <h3>User Segmentation</h3>
        <SegmentationChart :data="userSegmentation" :loading="chartsLoading" />
      </div>
    </div>

    <!-- Detailed Analytics -->
    <div class="analytics-grid">
      <!-- User Retention -->
      <div class="analytics-card">
        <h3>User Retention Rates</h3>
        <div class="retention-metrics">
          <div class="retention-item">
            <span class="retention-label">1 Day Retention</span>
            <span class="retention-value">{{
              formatPercentage(userAnalytics?.userRetentionRates?.day1 || 0)
            }}</span>
          </div>
          <div class="retention-item">
            <span class="retention-label">7 Day Retention</span>
            <span class="retention-value">{{
              formatPercentage(userAnalytics?.userRetentionRates?.day7 || 0)
            }}</span>
          </div>
          <div class="retention-item">
            <span class="retention-label">30 Day Retention</span>
            <span class="retention-value">{{
              formatPercentage(userAnalytics?.userRetentionRates?.day30 || 0)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Top Countries -->
      <div class="analytics-card">
        <h3>Top User Countries</h3>
        <div class="countries-list">
          <div
            v-for="(count, country) in userAnalytics?.topUserCountries"
            :key="country"
            class="country-item"
          >
            <span class="country-name">{{ country }}</span>
            <span class="country-count">{{ formatNumber(count) }}</span>
          </div>
        </div>
      </div>

      <!-- Feature Usage -->
      <div class="analytics-card">
        <h3>Feature Usage</h3>
        <div class="feature-usage">
          <div
            v-for="(usage, feature) in userAnalytics?.featureUsage"
            :key="feature"
            class="feature-item"
          >
            <span class="feature-name">{{ formatFeatureName(feature) }}</span>
            <span class="feature-count">{{ formatNumber(usage) }}</span>
          </div>
        </div>
      </div>

      <!-- File Types -->
      <div class="analytics-card">
        <h3>Top File Types</h3>
        <div class="file-types">
          <div
            v-for="(count, type) in userAnalytics?.storageUsage?.topFileTypes"
            :key="type"
            class="file-type-item"
          >
            <span class="file-type-name">{{ type.toString().toUpperCase() }}</span>
            <span class="file-type-count">{{ formatNumber(count) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- System Health Details -->
    <div class="system-health-section">
      <h3>System Health Details</h3>
      <div class="health-grid">
        <div class="health-metric">
          <label>Response Time</label>
          <span class="health-value" :class="getHealthClass('responseTime')">
            {{ systemHealth?.responseTime || 0 }}ms
          </span>
        </div>
        <div class="health-metric">
          <label>Error Rate</label>
          <span class="health-value" :class="getHealthClass('errorRate')">
            {{ formatPercentage(systemHealth?.errorRate || 0) }}
          </span>
        </div>
        <div class="health-metric">
          <label>Memory Usage</label>
          <span class="health-value" :class="getHealthClass('memoryUsage')">
            {{ formatPercentage(systemHealth?.memoryUsage || 0) }}
          </span>
        </div>
        <div class="health-metric">
          <label>CPU Usage</label>
          <span class="health-value" :class="getHealthClass('cpuUsage')">
            {{ formatPercentage(systemHealth?.cpuUsage || 0) }}
          </span>
        </div>
        <div class="health-metric">
          <label>Disk Usage</label>
          <span class="health-value" :class="getHealthClass('diskUsage')">
            {{ formatPercentage(systemHealth?.diskUsage || 0) }}
          </span>
        </div>
        <div class="health-metric">
          <label>Active Connections</label>
          <span class="health-value">
            {{ formatNumber(systemHealth?.activeConnections || 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Admin Actions -->
    <div class="admin-actions">
      <h3>Admin Actions</h3>
      <div class="actions-grid">
        <button class="action-btn danger" @click="showPurgeModal = true" :disabled="isProcessing">
          Purge Inactive Users
        </button>
        <button class="action-btn warning" @click="optimizeSystem" :disabled="isProcessing">
          Optimize System
        </button>
        <button class="action-btn primary" @click="exportAnalytics" :disabled="isProcessing">
          Export Analytics
        </button>
        <button class="action-btn secondary" @click="runHealthCheck" :disabled="isProcessing">
          Run Health Check
        </button>
      </div>
    </div>

    <!-- Alerts Panel -->
    <div v-if="systemHealth?.alerts?.length" class="alerts-panel">
      <h3>System Alerts</h3>
      <div class="alerts-list">
        <div
          v-for="alert in systemHealth.alerts"
          :key="alert.timestamp"
          class="alert-item"
          :class="alert.type"
        >
          <div class="alert-icon">
            {{ alert.type === 'critical' ? '🚨' : '⚠️' }}
          </div>
          <div class="alert-content">
            <p class="alert-message">{{ alert.message }}</p>
            <small class="alert-time">{{ formatTime(alert.timestamp) }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Purge Users Modal -->
    <div v-if="showPurgeModal" class="modal-overlay" @click="showPurgeModal = false">
      <div class="modal" @click.stop>
        <h3>Purge Inactive Users</h3>
        <p>This will permanently delete users who haven't logged in for the specified period.</p>
        <div class="modal-form">
          <label>Days since last login:</label>
          <input
            v-model.number="purgeSettings.daysSinceLastLogin"
            type="number"
            min="30"
            max="1095"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showPurgeModal = false">Cancel</button>
          <button class="btn btn-danger" @click="confirmPurgeUsers">Purge Users</button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading dashboard data...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import MetricCard from './MetricCard.vue';
import ActivityChart from './ActivityChart.vue';
import SegmentationChart from './SegmentationChart.vue';
// import { AdminService } from '../../services/admin.service';

// Reactive data
const isLoading = ref(false);
const chartsLoading = ref(false);
const isProcessing = ref(false);
const selectedTimeRange = ref(30);
const showPurgeModal = ref(false);

const userAnalytics = ref(null);
const activityTrends = ref([]);
const userSegmentation = ref(null);
const systemHealth = ref(null);

const purgeSettings = reactive({
  daysSinceLastLogin: 365,
});

// Computed properties
const alertClass = computed(() => {
  if (!systemHealth.value) return '';
  switch (systemHealth.value.status) {
    case 'warning':
      return 'alert-warning';
    case 'critical':
      return 'alert-critical';
    default:
      return 'alert-healthy';
  }
});

// Methods
const refreshAllData = async () => {
  isLoading.value = true;
  try {
    await Promise.all([
      loadUserAnalytics(),
      loadActivityTrends(),
      loadUserSegmentation(),
      loadSystemHealth(),
    ]);
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    // Show error notification
  } finally {
    isLoading.value = false;
  }
};

const loadUserAnalytics = async () => {
  try {
    // Mock data for now - replace with actual service call
    userAnalytics.value = {
      totalUsers: 12450,
      activeUsers: 8932,
      newUsersThisMonth: 1543,
      userGrowthRate: 12.3,
      averageSessionDuration: 1845,
      topUserCountries: {
        'United States': 4521,
        Canada: 1876,
        'United Kingdom': 1432,
        Germany: 987,
        France: 743,
      },
      userRetentionRates: {
        day1: 78.5,
        day7: 54.2,
        day30: 23.8,
      },
      featureUsage: {
        vault_items_created: 45632,
        files_uploaded: 12845,
        files_shared: 3421,
      },
      storageUsage: {
        totalFiles: 156789,
        totalSize: 2147483648,
        averageFileSize: 13698,
        topFileTypes: {
          image: 45632,
          document: 23541,
          video: 8765,
          audio: 3421,
          other: 12543,
        },
      },
    };
  } catch (error) {
    console.error('Error loading user analytics:', error);
  }
};

const loadActivityTrends = async () => {
  chartsLoading.value = true;
  try {
    // Mock data for now
    activityTrends.value = generateMockActivityTrends();
  } catch (error) {
    console.error('Error loading activity trends:', error);
  } finally {
    chartsLoading.value = false;
  }
};

const loadUserSegmentation = async () => {
  try {
    // Mock data for now
    userSegmentation.value = {
      powerUsers: { count: 1245, percentage: 10, definition: 'High activity users' },
      regularUsers: { count: 4981, percentage: 40, definition: 'Moderate activity users' },
      lightUsers: { count: 3736, percentage: 30, definition: 'Low activity users' },
      inactiveUsers: { count: 1869, percentage: 15, definition: 'Inactive users' },
      newUsers: { count: 623, percentage: 5, definition: 'New users' },
    };
  } catch (error) {
    console.error('Error loading user segmentation:', error);
  }
};

const loadSystemHealth = async () => {
  try {
    // Mock data for now
    systemHealth.value = {
      status: 'healthy',
      uptime: 2592000, // 30 days in seconds
      responseTime: 142,
      errorRate: 0.02,
      activeConnections: 1547,
      memoryUsage: 68.5,
      cpuUsage: 23.8,
      diskUsage: 45.2,
      lastChecked: new Date().toISOString(),
      alerts: [],
    };
  } catch (error) {
    console.error('Error loading system health:', error);
  }
};

const onTimeRangeChange = () => {
  loadUserAnalytics();
  loadActivityTrends();
};

const runHealthCheck = async () => {
  isProcessing.value = true;
  try {
    await loadSystemHealth();
    // Show success notification
  } catch (error) {
    console.error('Error running health check:', error);
  } finally {
    isProcessing.value = false;
  }
};

const optimizeSystem = async () => {
  isProcessing.value = true;
  try {
    // Call optimization service
    await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
    // Show success notification
  } catch (error) {
    console.error('Error optimizing system:', error);
  } finally {
    isProcessing.value = false;
  }
};

const confirmPurgeUsers = async () => {
  isProcessing.value = true;
  showPurgeModal.value = false;
  try {
    // Call purge service
    await new Promise(resolve => setTimeout(resolve, 3000)); // Mock delay
    // Refresh user analytics
    await loadUserAnalytics();
    // Show success notification
  } catch (error) {
    console.error('Error purging users:', error);
  } finally {
    isProcessing.value = false;
  }
};

const exportAnalytics = () => {
  const data = {
    userAnalytics: userAnalytics.value,
    activityTrends: activityTrends.value,
    userSegmentation: userSegmentation.value,
    systemHealth: systemHealth.value,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zk-vault-analytics-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Utility functions
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatFeatureName = (feature: string): string => {
  return feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

const getSystemStatusMessage = (): string => {
  if (!systemHealth.value) return '';
  switch (systemHealth.value.status) {
    case 'warning':
      return 'System is experiencing minor issues. Performance may be affected.';
    case 'critical':
      return 'System is experiencing critical issues. Immediate attention required.';
    default:
      return 'All systems are operating normally.';
  }
};

const getHealthClass = (metric: string): string => {
  if (!systemHealth.value) return '';
  const value = systemHealth.value[metric];

  switch (metric) {
    case 'responseTime':
      return value > 1000 ? 'critical' : value > 500 ? 'warning' : 'healthy';
    case 'errorRate':
      return value > 5 ? 'critical' : value > 1 ? 'warning' : 'healthy';
    case 'memoryUsage':
    case 'cpuUsage':
    case 'diskUsage':
      return value > 90 ? 'critical' : value > 75 ? 'warning' : 'healthy';
    default:
      return 'healthy';
  }
};

const generateMockActivityTrends = () => {
  const trends = [];
  const now = new Date();

  for (let i = selectedTimeRange.value; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    trends.push({
      timestamp: date.toISOString().split('T')[0],
      activeUsers: Math.floor(Math.random() * 2000) + 5000,
      newUsers: Math.floor(Math.random() * 100) + 20,
      sessions: Math.floor(Math.random() * 5000) + 8000,
      fileUploads: Math.floor(Math.random() * 500) + 100,
    });
  }

  return trends;
};

// Initialize dashboard
onMounted(() => {
  refreshAllData();
});
</script>

<style scoped>
.admin-dashboard {
  padding: 2rem;
  background: #f8fafc;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dashboard-title {
  margin: 0;
  color: #1a202c;
  font-size: 2rem;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.time-range-selector {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
}

.alert {
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.alert-healthy {
  background: #dcfce7;
  border-left: 4px solid #16a34a;
}
.alert-warning {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}
.alert-critical {
  background: #fecaca;
  border-left: 4px solid #ef4444;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.analytics-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.analytics-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #374151;
}

.retention-metrics,
.countries-list,
.feature-usage,
.file-types {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.retention-item,
.country-item,
.feature-item,
.file-type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.system-health-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.health-metric {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.health-metric label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 600;
}

.health-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.health-value.healthy {
  color: #16a34a;
}
.health-value.warning {
  color: #f59e0b;
}
.health-value.critical {
  color: #ef4444;
}

.admin-actions {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.action-btn {
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}
.action-btn.secondary {
  background: #6b7280;
  color: white;
}
.action-btn.warning {
  background: #f59e0b;
  color: white;
}
.action-btn.danger {
  background: #ef4444;
  color: white;
}

.alerts-panel {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.alert-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid;
}

.alert-item.warning {
  background: #fef3c7;
  border-color: #f59e0b;
}

.alert-item.critical {
  background: #fecaca;
  border-color: #ef4444;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}

.modal-form {
  margin: 1.5rem 0;
}

.modal-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.modal-form input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .admin-dashboard {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
