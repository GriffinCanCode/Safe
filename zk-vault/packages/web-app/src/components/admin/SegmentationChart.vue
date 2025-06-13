<template>
  <div class="segmentation-chart">
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <p>Loading segmentation data...</p>
    </div>
    
    <div v-else-if="!data" class="chart-empty">
      <p>No segmentation data available</p>
    </div>
    
    <div v-else class="chart-container">
      <canvas ref="chartCanvas" :width="chartSize" :height="chartSize"></canvas>
      
      <div class="chart-legend">
        <div 
          v-for="(segment, key) in data" 
          :key="key" 
          class="legend-item"
          @mouseenter="highlightSegment(key)"
          @mouseleave="clearHighlight"
        >
          <span 
            class="legend-color" 
            :style="{ backgroundColor: colors[key] }"
          ></span>
          <div class="legend-details">
            <div class="legend-title">{{ formatSegmentName(key) }}</div>
            <div class="legend-stats">
              <span class="count">{{ segment.count?.toLocaleString() }}</span>
              <span class="percentage">({{ segment.percentage }}%)</span>
            </div>
            <div class="legend-description">{{ segment.definition }}</div>
          </div>
        </div>
      </div>
      
      <div class="chart-tooltip" ref="tooltip" v-show="tooltipVisible" :style="tooltipStyle">
        <div class="tooltip-title">{{ tooltipData.title }}</div>
        <div class="tooltip-count">{{ tooltipData.count?.toLocaleString() }} users</div>
        <div class="tooltip-percentage">{{ tooltipData.percentage }}% of total</div>
        <div class="tooltip-description">{{ tooltipData.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';

interface SegmentData {
  count: number;
  percentage: number;
  definition: string;
}

interface Props {
  data: Record<string, SegmentData> | null;
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
const highlightedSegment = ref<string | null>(null);

const chartSize = ref(350);

const colors: Record<string, string> = {
  powerUsers: '#3b82f6',
  regularUsers: '#10b981',
  lightUsers: '#f59e0b',
  inactiveUsers: '#ef4444',
  newUsers: '#8b5cf6'
};

const drawChart = () => {
  if (!chartCanvas.value || !props.data) return;
  
  const canvas = chartCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, chartSize.value, chartSize.value);
  
  const centerX = chartSize.value / 2;
  const centerY = chartSize.value / 2;
  const outerRadius = chartSize.value / 2 - 20;
  const innerRadius = outerRadius * 0.6; // Donut hole
  
  // Calculate total for percentages
  const total = Object.values(props.data).reduce((sum, segment) => sum + segment.count, 0);
  
  let currentAngle = -Math.PI / 2; // Start at top
  
  Object.entries(props.data).forEach(([key, segment]) => {
    const sliceAngle = (segment.count / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;
    
    // Determine if this segment should be highlighted
    const isHighlighted = highlightedSegment.value === key;
    const currentOuterRadius = isHighlighted ? outerRadius + 10 : outerRadius;
    
    // Draw outer arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentOuterRadius, currentAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
    ctx.closePath();
    
    ctx.fillStyle = colors[key] || '#6b7280';
    ctx.fill();
    
    // Add stroke
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw percentage labels
    if (segment.percentage >= 5) { // Only show labels for segments >= 5%
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = (currentOuterRadius + innerRadius) / 2;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${segment.percentage}%`, labelX, labelY);
    }
    
    currentAngle = endAngle;
  });
  
  // Draw center text
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Users', centerX, centerY - 10);
  
  ctx.font = '24px sans-serif';
  ctx.fillText(total.toLocaleString(), centerX, centerY + 15);
  
  // Add mouse event handlers
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!chartCanvas.value || !props.data) return;
  
  const rect = chartCanvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const centerX = chartSize.value / 2;
  const centerY = chartSize.value / 2;
  const outerRadius = chartSize.value / 2 - 20;
  const innerRadius = outerRadius * 0.6;
  
  // Calculate distance from center
  const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  
  // Check if mouse is within donut area
  if (distance >= innerRadius && distance <= outerRadius) {
    // Calculate angle
    const angle = Math.atan2(y - centerY, x - centerX);
    const normalizedAngle = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    
    // Find which segment the mouse is over
    const total = Object.values(props.data).reduce((sum, segment) => sum + segment.count, 0);
    let currentAngle = 0;
    
    for (const [key, segment] of Object.entries(props.data)) {
      const sliceAngle = (segment.count / total) * 2 * Math.PI;
      const endAngle = currentAngle + sliceAngle;
      
      if (normalizedAngle >= currentAngle && normalizedAngle <= endAngle) {
        // Show tooltip
        tooltipData.value = {
          title: formatSegmentName(key),
          count: segment.count,
          percentage: segment.percentage,
          description: segment.definition
        };
        
        tooltipStyle.value = {
          left: `${event.clientX - rect.left + 10}px`,
          top: `${event.clientY - rect.top - 10}px`
        };
        
        tooltipVisible.value = true;
        break;
      }
      
      currentAngle = endAngle;
    }
  } else {
    tooltipVisible.value = false;
  }
};

const handleMouseLeave = () => {
  tooltipVisible.value = false;
  clearHighlight();
};

const highlightSegment = (key: string) => {
  highlightedSegment.value = key;
  drawChart();
};

const clearHighlight = () => {
  highlightedSegment.value = null;
  drawChart();
};

const formatSegmentName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

const resizeChart = () => {
  const container = chartCanvas.value?.parentElement;
  if (container) {
    const size = Math.min(350, container.clientWidth * 0.8);
    chartSize.value = size;
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

watch(highlightedSegment, () => {
  drawChart();
});
</script>

<style scoped>
.segmentation-chart {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
  min-height: 350px;
}

.chart-loading,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 350px;
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
  display: flex;
  align-items: center;
  gap: 2rem;
  width: 100%;
}

canvas {
  cursor: pointer;
  flex-shrink: 0;
}

.chart-legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 250px;
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.legend-item:hover {
  background-color: #f9fafb;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 2px;
}

.legend-details {
  flex: 1;
}

.legend-title {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.legend-stats {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.count {
  font-weight: 600;
  color: #1f2937;
}

.percentage {
  color: #6b7280;
}

.legend-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
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
  min-width: 200px;
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.tooltip-count {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.tooltip-percentage {
  color: #d1d5db;
  margin-bottom: 0.5rem;
}

.tooltip-description {
  color: #e5e7eb;
  font-size: 0.8rem;
  line-height: 1.3;
}

@media (max-width: 768px) {
  .segmentation-chart {
    flex-direction: column;
    gap: 1rem;
    min-height: auto;
  }
  
  .chart-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .chart-legend {
    min-width: auto;
    width: 100%;
  }
  
  .legend-item {
    padding: 0.5rem;
  }
  
  .legend-details {
    font-size: 0.875rem;
  }
  
  .chart-tooltip {
    font-size: 0.75rem;
    min-width: 150px;
  }
}
</style> 