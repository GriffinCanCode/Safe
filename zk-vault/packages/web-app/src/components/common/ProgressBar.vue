<template>
  <div
    class="progress-wrapper"
    :class="wrapperClasses"
    role="progressbar"
    :aria-valuenow="value"
    :aria-valuemin="min || 0"
    :aria-valuemax="max || 100"
    :aria-label="label || 'Progress'"
    :aria-describedby="showText ? `${progressId}-text` : ''"
  >
    <div v-if="showLabel && label" class="progress-label">
      <span>{{ label }}</span>
      <span v-if="showPercentage" class="progress-percentage"> {{ Math.round(percentage) }}% </span>
    </div>

    <div class="progress-track" :class="trackClasses">
      <div
        class="progress-fill"
        :class="fillClasses"
        :style="{ '--progress-width': `${percentage}%` }"
      >
        <div v-if="animated" class="progress-animation" />
      </div>
    </div>

    <div
      v-if="showText && text"
      :id="`${progressId}-text`"
      class="progress-text"
      :class="textClasses"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { generateId } from '@/utils/helpers';

interface Props {
  value: number;
  min?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  label?: string;
  text?: string;
  showLabel?: boolean;
  showText?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  striped?: boolean;
  rounded?: boolean;
  indeterminate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  size: 'md',
  variant: 'primary',
  showLabel: false,
  showText: false,
  showPercentage: false,
  animated: false,
  striped: false,
  rounded: true,
  indeterminate: false,
});

// State
const progressId = generateId('progress');

// Computed
const percentage = computed(() => {
  if (props.indeterminate) return 0;
  const range = props.max - props.min;
  const adjustedValue = Math.max(props.min, Math.min(props.max, props.value));
  return ((adjustedValue - props.min) / range) * 100;
});

const wrapperClasses = computed(() => ({
  [`progress-${props.size}`]: true,
  'progress-indeterminate': props.indeterminate,
}));

const trackClasses = computed(() => ({
  'progress-track-rounded': props.rounded,
  'progress-track-striped': props.striped,
  'progress-track-animated': props.animated && props.striped,
}));

const fillClasses = computed(() => ({
  [`progress-fill-${props.variant}`]: true,
  'progress-fill-striped': props.striped,
  'progress-fill-animated': props.animated,
  'progress-fill-indeterminate': props.indeterminate,
}));

// fillStyle removed - now using CSS custom properties

const textClasses = computed(() => ({
  [`progress-text-${props.size}`]: true,
}));
</script>

<!-- CSS classes are now defined in /styles/components/common/progress-bar.css -->
