<template>
  <div class="activity-chart">
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <p>Loading activity data...</p>
    </div>
    
    <div v-else-if="!data.length" class="chart-empty">
      <p>No activity data available</p>
    </div>
    
    <div v-else class="chart-container">
      <div class="chart-legend">
        <div class="legend-item">
          <span class="legend-color active-users"></span>
          <span>Active Users</span>
        </div>
        <div class="legend-item">
          <span class="legend-color new-users"></span>
          <span>New Users</span>
        </div>
        <div class="legend-item">
          <span class="legend-color sessions"></span>
          <span>Sessions</span>
        </div>
        <div class="legend-item">
          <span class="legend-color file-uploads"></span>
          <span>File Uploads</span>
        </div>
      </div>
      
      <canvas ref="chartCanvas" :width="chartWidth" :height="chartHeight"></canvas>
      
      <div class="chart-tooltip" ref="tooltip" v-show="tooltipVisible" :style="tooltipStyle">
        <div class="tooltip-date">{{ tooltipData.date }}</div>
        <div class="tooltip-metrics">
          <div class="tooltip-metric">
            <span class="metric-label">Active Users:</span>
            <span class="metric-value">{{ tooltipData.activeUsers?.toLocaleString() }}</span>
          </div>
          <div class="tooltip-metric">
            <span class="metric-label">New Users:</span>
            <span class="metric-value">{{ tooltipData.newUsers?.toLocaleString() }}</span>
          </div>
          <div class="tooltip-metric">
            <span class="metric-label">Sessions:</span>
            <span class="metric-value">{{ tooltipData.sessions?.toLocaleString() }}</span>
          </div>
          <div class="tooltip-metric">
            <span class="metric-label">File Uploads:</span>
            <span class="metric-value">{{ tooltipData.fileUploads?.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';

interface ActivityData {
  timestamp: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  fileUploads: number;
}

interface Props {
  data: ActivityData[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
const tooltip = ref<HTMLElement | null>(null);
const tooltipVisible = ref(false);
const tooltipData = ref<any>({});
const tooltipStyle = ref<any>({});

const chartWidth = ref(800);
const chartHeight = ref(400);

const colors = {
  activeUsers: '#3b82f6',
  newUsers: '#10b981',
  sessions: '#f59e0b',
  fileUploads: '#ef4444'
};

const drawChart = () => {
  if (!chartCanvas.value || !props.data.length) return;
  
  const canvas = chartCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, chartWidth.value, chartHeight.value);
  
  // Set up chart dimensions
  const padding = 60;
  const chartAreaWidth = chartWidth.value - padding * 2;
  const chartAreaHeight = chartHeight.value - padding * 2;
  
  // Get data ranges
  const maxActiveUsers = Math.max(...props.data.map(d => d.activeUsers));
  const maxNewUsers = Math.max(...props.data.map(d => d.newUsers));
  const maxSessions = Math.max(...props.data.map(d => d.sessions));
  const maxFileUploads = Math.max(...props.data.map(d => d.fileUploads));
  
  // Normalize to percentages for multi-line chart
  const maxValue = Math.max(maxActiveUsers, maxSessions);
  
  // Draw grid lines
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartAreaHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartAreaWidth, y);
    ctx.stroke();
    
    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    const value = maxValue - (maxValue / 5) * i;
    ctx.fillText(value.toLocaleString(), padding - 10, y + 4);
  }
  
  // Vertical grid lines
  const stepX = chartAreaWidth / (props.data.length - 1);
  for (let i = 0; i < props.data.length; i++) {
    const x = padding + stepX * i;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + chartAreaHeight);
    ctx.stroke();
    
    // X-axis labels (show every 3rd label to avoid crowding)
    if (i % 3 === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const date = new Date(props.data[i].timestamp);
      ctx.fillText(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, padding + chartAreaHeight + 20);
    }
  }
  
  // Draw lines
  const drawLine = (dataKey: keyof ActivityData, color: string, scale: number = maxValue) => {
    if (dataKey === 'timestamp') return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    props.data.forEach((point, index) => {
      const x = padding + stepX * index;
      const value = point[dataKey] as number;
      const y = padding + chartAreaHeight - (value / scale) * chartAreaHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    props.data.forEach((point, index) => {
      const x = padding + stepX * index;
      const value = point[dataKey] as number;
      const y = padding + chartAreaHeight - (value / scale) * chartAreaHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  
  // Draw all lines
  drawLine('activeUsers', colors.activeUsers);
  drawLine('sessions', colors.sessions);
  drawLine('newUsers', colors.newUsers, maxNewUsers);
  drawLine('fileUploads', colors.fileUploads, maxFileUploads);
  
  // Add mouse event handlers
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!chartCanvas.value || !props.data.length) return;
  
  const rect = chartCanvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const padding = 60;
  const chartAreaWidth = chartWidth.value - padding * 2;
  const stepX = chartAreaWidth / (props.data.length - 1);
  
  // Find closest data point
  const dataIndex = Math.round((x - padding) / stepX);
  
  if (dataIndex >= 0 && dataIndex < props.data.length) {
    const dataPoint = props.data[dataIndex];
    tooltipData.value = {
      date: new Date(dataPoint.timestamp).toLocaleDateString(),
      activeUsers: dataPoint.activeUsers,
      newUsers: dataPoint.newUsers,
      sessions: dataPoint.sessions,
      fileUploads: dataPoint.fileUploads
    };
    
    tooltipStyle.value = {
      left: `${event.clientX - rect.left + 10}px`,
      top: `${event.clientY - rect.top - 10}px`
    };
    
    tooltipVisible.value = true;
  }
};

const handleMouseLeave = () => {
  tooltipVisible.value = false;
};

const resizeChart = () => {
  const container = chartCanvas.value?.parentElement;
  if (container) {
    chartWidth.value = container.clientWidth;
    chartHeight.value = Math.min(400, container.clientWidth * 0.5);
  }
};

onMounted(() => {
  resizeChart();
  window.addEventListener('resize', resizeChart);
  nextTick(() => {
    drawChart();
  });
});

watch(() => props.data, () => {
  nextTick(() => {
    drawChart();
  });
}, { deep: true });
</script>

<style scoped>
.activity-chart {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-loading,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart-container {
  position: relative;
  width: 100%;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.legend-color {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.legend-color.active-users {
  background-color: #3b82f6;
}

.legend-color.new-users {
  background-color: #10b981;
}

.legend-color.sessions {
  background-color: #f59e0b;
}

.legend-color.file-uploads {
  background-color: #ef4444;
}

canvas {
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.chart-tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 10;
  min-width: 180px;
}

.tooltip-date {
  font-weight: 600;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 0.25rem;
}

.tooltip-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tooltip-metric {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.metric-label {
  color: #d1d5db;
}

.metric-value {
  font-weight: 600;
}

@media (max-width: 768px) {
  .chart-legend {
    gap: 1rem;
  }
  
  .legend-item {
    font-size: 0.75rem;
  }
  
  .chart-tooltip {
    font-size: 0.75rem;
    min-width: 150px;
  }
}
</style> 