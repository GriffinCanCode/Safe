<template>
  <div 
    class="loading-spinner"
    :class="[
      sizeClass,
      colorClass,
      { 'inline': inline }
    ]"
    :aria-label="label"
    role="status"
  >
    <div class="spinner-circle" />
    <span v-if="text && !hideText" class="spinner-text">{{ text }}</span>
    <span class="sr-only">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'current'
  text?: string
  inline?: boolean
  hideText?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
  inline: false,
  hideText: false,
  label: 'Loading...'
})

const sizeClass = computed(() => {
  const sizeMap = {
    xs: 'spinner-xs',
    sm: 'spinner-sm', 
    md: 'spinner-md',
    lg: 'spinner-lg',
    xl: 'spinner-xl'
  }
  return sizeMap[props.size]
})

const colorClass = computed(() => {
  const colorMap = {
    primary: 'spinner-primary',
    secondary: 'spinner-secondary',
    white: 'spinner-white',
    current: 'spinner-current'
  }
  return colorMap[props.color]
})
</script>

<style scoped>
.loading-spinner {
  @apply flex items-center justify-center gap-3;
}

.loading-spinner.inline {
  @apply inline-flex;
}

.spinner-circle {
  @apply rounded-full border-2 border-solid animate-spin;
  border-color: currentColor transparent currentColor transparent;
  animation-duration: 1s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

/* Size variants */
.spinner-xs .spinner-circle {
  @apply w-3 h-3;
}

.spinner-sm .spinner-circle {
  @apply w-4 h-4;
}

.spinner-md .spinner-circle {
  @apply w-6 h-6;
}

.spinner-lg .spinner-circle {
  @apply w-8 h-8;
}

.spinner-xl .spinner-circle {
  @apply w-12 h-12;
}

/* Color variants */
.spinner-primary {
  @apply text-primary-600;
}

.spinner-secondary {
  @apply text-neutral-600;
}

.spinner-white {
  @apply text-white;
}

.spinner-current {
  @apply text-current;
}

/* Text styles */
.spinner-text {
  @apply text-sm font-medium text-neutral-700;
}

.spinner-xs .spinner-text,
.spinner-sm .spinner-text {
  @apply text-xs;
}

.spinner-lg .spinner-text,
.spinner-xl .spinner-text {
  @apply text-base;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .spinner-text {
    @apply text-neutral-300;
  }
  
  .spinner-secondary {
    @apply text-neutral-400;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .spinner-circle {
    animation-duration: 2s;
  }
}
</style>
