<template>
  <div class="metric-card">
    <div class="metric-header">
      <div class="metric-icon">{{ icon }}</div>
      <div class="metric-trend" v-if="trend !== undefined" :class="trendClass">
        {{ trendIcon }} {{ formatTrend() }}
      </div>
    </div>

    <div class="metric-body">
      <h3 class="metric-title">{{ title }}</h3>
      <div class="metric-value">{{ formattedValue }}</div>
      <div v-if="subtitle" class="metric-subtitle">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  value: number;
  icon: string;
  trend?: number;
  subtitle?: string;
  format?: 'number' | 'bytes' | 'duration' | 'uptime' | 'percentage';
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number',
});

const formattedValue = computed(() => {
  switch (props.format) {
    case 'bytes':
      return formatBytes(props.value);
    case 'duration':
      return formatDuration(props.value);
    case 'uptime':
      return formatUptime(props.value);
    case 'percentage':
      return `${props.value.toFixed(1)}%`;
    case 'number':
    default:
      return props.value.toLocaleString();
  }
});

const trendClass = computed(() => {
  if (props.trend === undefined) return '';
  return props.trend >= 0 ? 'trend-positive' : 'trend-negative';
});

const trendIcon = computed(() => {
  if (props.trend === undefined) return '';
  return props.trend >= 0 ? '↗' : '↘';
});

const formatTrend = () => {
  if (props.trend === undefined) return '';
  return `${Math.abs(props.trend).toFixed(1)}%`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else {
    return `${hours}h`;
  }
};
</script>

<style scoped>
.metric-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.metric-icon {
  font-size: 2rem;
  padding: 0.5rem;
  background: #f3f4f6;
  border-radius: 8px;
}

.metric-trend {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
}

.trend-positive {
  background: #dcfce7;
  color: #16a34a;
}

.trend-negative {
  background: #fecaca;
  color: #ef4444;
}

.metric-body {
  text-align: left;
}

.metric-title {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.25rem;
}

.metric-subtitle {
  font-size: 0.875rem;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .metric-card {
    padding: 1rem;
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .metric-icon {
    font-size: 1.5rem;
  }
}
</style>
