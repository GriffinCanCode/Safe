<template>
  <div 
    class="progress-wrapper"
    :class="wrapperClasses"
    role="progressbar"
    :aria-valuenow="value"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-label="label"
    :aria-describedby="showText ? `${progressId}-text` : undefined"
  >
    <div v-if="showLabel && label" class="progress-label">
      <span>{{ label }}</span>
      <span v-if="showPercentage" class="progress-percentage">
        {{ Math.round(percentage) }}%
      </span>
    </div>
    
    <div class="progress-track" :class="trackClasses">
      <div 
        class="progress-fill"
        :class="fillClasses"
        :style="fillStyle"
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
import { computed } from 'vue'
import { generateId } from '@/utils/helpers'

interface Props {
  value: number
  min?: number
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  label?: string
  text?: string
  showLabel?: boolean
  showText?: boolean
  showPercentage?: boolean
  animated?: boolean
  striped?: boolean
  rounded?: boolean
  indeterminate?: boolean
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
  indeterminate: false
})

// State
const progressId = generateId('progress')

// Computed
const percentage = computed(() => {
  if (props.indeterminate) return 0
  const range = props.max - props.min
  const adjustedValue = Math.max(props.min, Math.min(props.max, props.value))
  return ((adjustedValue - props.min) / range) * 100
})

const wrapperClasses = computed(() => ({
  [`progress-${props.size}`]: true,
  'progress-indeterminate': props.indeterminate
}))

const trackClasses = computed(() => ({
  'progress-track-rounded': props.rounded,
  'progress-track-striped': props.striped,
  'progress-track-animated': props.animated && props.striped
}))

const fillClasses = computed(() => ({
  [`progress-fill-${props.variant}`]: true,
  'progress-fill-striped': props.striped,
  'progress-fill-animated': props.animated,
  'progress-fill-indeterminate': props.indeterminate
}))

const fillStyle = computed(() => {
  if (props.indeterminate) return {}
  return {
    width: `${percentage.value}%`
  }
})

const textClasses = computed(() => ({
  [`progress-text-${props.size}`]: true
}))
</script>

<style scoped>
.progress-wrapper {
  @apply w-full;
}

.progress-label {
  @apply flex items-center justify-between mb-1;
}

.progress-label span {
  @apply text-sm font-medium text-neutral-700;
}

.progress-percentage {
  @apply text-neutral-500;
}

.progress-track {
  @apply relative w-full bg-neutral-200 overflow-hidden;
}

.progress-track-rounded {
  @apply rounded-full;
}

.progress-fill {
  @apply h-full transition-all duration-300 ease-out relative;
}

/* Size variants */
.progress-xs .progress-track {
  @apply h-1;
}

.progress-sm .progress-track {
  @apply h-2;
}

.progress-md .progress-track {
  @apply h-3;
}

.progress-lg .progress-track {
  @apply h-4;
}

.progress-xl .progress-track {
  @apply h-6;
}

/* Variant colors */
.progress-fill-primary {
  @apply bg-primary-600;
}

.progress-fill-secondary {
  @apply bg-neutral-600;
}

.progress-fill-success {
  @apply bg-success-600;
}

.progress-fill-warning {
  @apply bg-warning-600;
}

.progress-fill-danger {
  @apply bg-danger-600;
}

.progress-fill-info {
  @apply bg-info-600;
}

/* Striped pattern */
.progress-fill-striped {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
}

/* Animation */
.progress-fill-animated {
  animation: progress-stripes 1s linear infinite;
}

.progress-animation {
  @apply absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30;
  animation: progress-shimmer 2s infinite;
}

/* Indeterminate */
.progress-fill-indeterminate {
  @apply w-full;
  animation: progress-indeterminate 2s ease-in-out infinite;
}

.progress-fill-indeterminate::before {
  content: '';
  @apply absolute inset-0 bg-current;
  animation: progress-indeterminate-fill 2s ease-in-out infinite;
}

/* Text styles */
.progress-text {
  @apply mt-1 text-neutral-600;
}

.progress-text-xs {
  @apply text-xs;
}

.progress-text-sm {
  @apply text-sm;
}

.progress-text-md {
  @apply text-sm;
}

.progress-text-lg {
  @apply text-base;
}

.progress-text-xl {
  @apply text-lg;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .progress-track {
    @apply bg-neutral-700;
  }
  
  .progress-label span {
    @apply text-neutral-300;
  }
  
  .progress-percentage {
    @apply text-neutral-400;
  }
  
  .progress-text {
    @apply text-neutral-400;
  }
}

/* Animations */
@keyframes progress-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}

@keyframes progress-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes progress-indeterminate-fill {
  0%, 100% {
    width: 0%;
    margin-left: 0%;
  }
  50% {
    width: 100%;
    margin-left: 0%;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .progress-fill {
    @apply transition-none;
  }
  
  .progress-fill-animated,
  .progress-animation,
  .progress-fill-indeterminate,
  .progress-fill-indeterminate::before {
    animation: none;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  .progress-track {
    @apply border border-neutral-400;
  }
}
</style>
