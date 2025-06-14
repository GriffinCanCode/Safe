<template>
  <div class="audit-log">
    <!-- Header -->
    <div class="audit-header">
      <div class="header-content">
        <h2 class="audit-title">Security Audit Log</h2>
        <p class="audit-description">Track all security-related activities in your vault</p>
      </div>
      <div class="header-actions">
        <BaseButton variant="outline" size="sm" @click="exportLogs" :loading="exporting">
          Export
        </BaseButton>
        <BaseButton variant="outline" size="sm" @click="refreshLogs" :loading="loading">
          Refresh
        </BaseButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="audit-filters">
      <div class="filter-group">
        <label class="filter-label">Time Range</label>
        <select v-model="filters.timeRange" class="filter-select">
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Event Type</label>
        <select v-model="filters.eventType" class="filter-select">
          <option value="">All events</option>
          <option value="authentication">Authentication</option>
          <option value="password">Password changes</option>
          <option value="security">Security settings</option>
          <option value="access">Data access</option>
          <option value="breach">Breach alerts</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Severity</label>
        <select v-model="filters.severity" class="filter-select">
          <option value="">All levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div class="filter-group">
        <BaseInput
          v-model="filters.search"
          placeholder="Search events..."
          type="search"
          size="sm"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="audit-loading">
      <LoadingSpinner size="lg" />
      <p class="loading-text">Loading audit logs...</p>
    </div>

    <!-- Audit Log Entries -->
    <div v-else-if="filteredLogs.length > 0" class="audit-entries">
      <div
        v-for="entry in paginatedLogs"
        :key="entry.id"
        class="audit-entry"
        :class="getEntryClass(entry)"
      >
        <div class="entry-icon" :class="getIconClass(entry.type, entry.severity)">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="getIconPath(entry.type)"
            />
          </svg>
        </div>

        <div class="entry-content">
          <div class="entry-header">
            <h4 class="entry-title">{{ entry.title }}</h4>
            <div class="entry-meta">
              <span class="entry-time">{{ formatDateTime(entry.timestamp) }}</span>
              <span class="entry-severity" :class="getSeverityClass(entry.severity)">
                {{ entry.severity.toUpperCase() }}
              </span>
            </div>
          </div>

          <p class="entry-description">{{ entry.description }}</p>

          <div v-if="entry.details" class="entry-details">
            <div class="details-grid">
              <div v-if="entry.details.ipAddress" class="detail-item">
                <span class="detail-label">IP Address:</span>
                <span class="detail-value">{{ entry.details.ipAddress }}</span>
              </div>
              <div v-if="entry.details.userAgent" class="detail-item">
                <span class="detail-label">User Agent:</span>
                <span class="detail-value">{{ entry.details.userAgent }}</span>
              </div>
              <div v-if="entry.details.location" class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">{{ entry.details.location }}</span>
              </div>
              <div v-if="entry.details.device" class="detail-item">
                <span class="detail-label">Device:</span>
                <span class="detail-value">{{ entry.details.device }}</span>
              </div>
            </div>
          </div>

          <div v-if="entry.actions && entry.actions.length > 0" class="entry-actions">
            <BaseButton
              v-for="action in entry.actions"
              :key="action.id"
              variant="outline"
              size="xs"
              @click="handleAction(action, entry)"
            >
              {{ action.label }}
            </BaseButton>
          </div>
        </div>

        <div v-if="entry.status" class="entry-status" :class="getStatusClass(entry.status)">
          {{ entry.status }}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="audit-empty">
      <div class="empty-icon">
        <svg
          class="h-16 w-16 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 class="empty-title">No audit logs found</h3>
      <p class="empty-description">
        {{
          filters.search || filters.eventType || filters.severity
            ? 'No logs match your current filters.'
            : 'No security events have been recorded yet.'
        }}
      </p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="audit-pagination">
      <BaseButton variant="outline" size="sm" :disabled="currentPage === 1" @click="currentPage--">
        Previous
      </BaseButton>

      <span class="pagination-info">
        Page {{ currentPage }} of {{ totalPages }} ({{ filteredLogs.length }} total)
      </span>

      <BaseButton
        variant="outline"
        size="sm"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        Next
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseInput from '@/components/common/BaseInput.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { useAuthStore } from '@/store/auth.store';
import { formatRelativeTime } from '@/utils/helpers';

interface AuditLogEntry {
  id: string;
  type: 'authentication' | 'password' | 'security' | 'access' | 'breach';
  title: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status?: 'success' | 'failed' | 'pending' | 'blocked';
  userId?: string;
  details?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    device?: string;
    [key: string]: any;
  };
  actions?: Array<{
    id: string;
    label: string;
    action: string;
  }>;
}

interface AuditFilters {
  timeRange: '24h' | '7d' | '30d' | '90d' | 'all';
  eventType: string;
  severity: string;
  search: string;
}

// Store
const authStore = useAuthStore();

// State
const loading = ref(false);
const exporting = ref(false);
const auditLogs = ref<AuditLogEntry[]>([]);
const currentPage = ref(1);
const itemsPerPage = 20;

const filters = ref<AuditFilters>({
  timeRange: '30d',
  eventType: '',
  severity: '',
  search: '',
});

// Computed
const filteredLogs = computed(() => {
  let logs = [...auditLogs.value];

  // Filter by time range
  if (filters.value.timeRange !== 'all') {
    const now = new Date();
    const timeRanges: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const cutoff = new Date(now.getTime() - timeRanges[filters.value.timeRange]);
    logs = logs.filter(log => log.timestamp >= cutoff);
  }

  // Filter by event type
  if (filters.value.eventType) {
    logs = logs.filter(log => log.type === filters.value.eventType);
  }

  // Filter by severity
  if (filters.value.severity) {
    logs = logs.filter(log => log.severity === filters.value.severity);
  }

  // Filter by search
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    logs = logs.filter(
      log =>
        log.title.toLowerCase().includes(search) || log.description.toLowerCase().includes(search)
    );
  }

  // Sort by timestamp (newest first)
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
});

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / itemsPerPage));

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredLogs.value.slice(start, end);
});

// Methods
const loadAuditLogs = async () => {
  loading.value = true;

  try {
    // Simulate API call - in real app, this would fetch from backend
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock audit log data
    auditLogs.value = [
      {
        id: '1',
        type: 'authentication',
        title: 'Successful Login',
        description: 'User logged in successfully using master password',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        severity: 'low',
        status: 'success',
        details: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          location: 'San Francisco, CA',
          device: 'MacBook Pro',
        },
      },
      {
        id: '2',
        type: 'password',
        title: 'Master Password Changed',
        description: 'User successfully updated their master password',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        severity: 'medium',
        status: 'success',
        details: {
          ipAddress: '192.168.1.100',
          device: 'MacBook Pro',
        },
      },
      {
        id: '3',
        type: 'breach',
        title: 'Password Breach Detected',
        description: '2 passwords found in recent data breach database',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        severity: 'high',
        status: 'pending',
        actions: [
          { id: 'view-breached', label: 'View Passwords', action: 'view-breached-passwords' },
          { id: 'dismiss', label: 'Dismiss', action: 'dismiss-breach' },
        ],
      },
      {
        id: '4',
        type: 'security',
        title: 'Two-Factor Authentication Enabled',
        description: 'User enabled two-factor authentication for their account',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        severity: 'low',
        status: 'success',
      },
      {
        id: '5',
        type: 'authentication',
        title: 'Failed Login Attempt',
        description: 'Failed login attempt with incorrect master password',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        severity: 'medium',
        status: 'failed',
        details: {
          ipAddress: '203.0.113.42',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          location: 'Unknown',
        },
      },
      {
        id: '6',
        type: 'access',
        title: 'Vault Data Exported',
        description: 'User exported vault data to encrypted backup file',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        severity: 'medium',
        status: 'success',
      },
    ];
  } catch (error) {
    console.error('Failed to load audit logs:', error);
  } finally {
    loading.value = false;
  }
};

const refreshLogs = () => {
  loadAuditLogs();
};

const exportLogs = async () => {
  exporting.value = true;

  try {
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In real app, this would generate and download a file
    const data = JSON.stringify(filteredLogs.value, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export logs:', error);
  } finally {
    exporting.value = false;
  }
};

const handleAction = (action: any, entry: AuditLogEntry) => {
  switch (action.action) {
    case 'view-breached-passwords':
      // Emit event to parent or navigate
      break;
    case 'dismiss-breach':
      // Mark as dismissed
      break;
  }
};

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const getEntryClass = (entry: AuditLogEntry) => {
  return {
    'entry-critical': entry.severity === 'critical',
    'entry-high': entry.severity === 'high',
    'entry-failed': entry.status === 'failed' || entry.status === 'blocked',
  };
};

const getIconClass = (type: string, severity: string) => {
  const baseClass = 'entry-icon';

  if (severity === 'critical' || severity === 'high') {
    return `${baseClass} icon-danger`;
  } else if (severity === 'medium') {
    return `${baseClass} icon-warning`;
  } else {
    return `${baseClass} icon-info`;
  }
};

const getIconPath = (type: string) => {
  switch (type) {
    case 'authentication':
      return 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1';
    case 'password':
      return 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z';
    case 'security':
      return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
    case 'access':
      return 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    case 'breach':
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
    default:
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
};

const getSeverityClass = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'severity-critical';
    case 'high':
      return 'severity-high';
    case 'medium':
      return 'severity-medium';
    case 'low':
      return 'severity-low';
    default:
      return 'severity-low';
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'success':
      return 'status-success';
    case 'failed':
      return 'status-failed';
    case 'pending':
      return 'status-pending';
    case 'blocked':
      return 'status-blocked';
    default:
      return 'status-neutral';
  }
};

// Watch for filter changes to reset pagination
watch(
  filters,
  () => {
    currentPage.value = 1;
  },
  { deep: true }
);

// Lifecycle
onMounted(() => {
  loadAuditLogs();
});
</script>
