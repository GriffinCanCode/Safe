<template>
  <div 
    :class="[
      'loading-spinner-container',
      { 'loading-spinner-inline': inline },
      sizeClass,
      colorClass
    ]"
    :aria-label="label || 'Loading...'"
    role="status"
  >
    <div class="loading-spinner" />
    <span v-if="text && !hideText" class="loading-text" :class="textSizeClass">{{ text }}</span>
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
    xs: 'loading-spinner-xs',
    sm: 'loading-spinner-sm', 
    md: 'loading-spinner-md',
    lg: 'loading-spinner-lg',
    xl: 'loading-spinner-xl'
  }
  return sizeMap[props.size]
})

const colorClass = computed(() => {
  const colorMap = {
    primary: 'loading-spinner-primary',
    secondary: 'loading-spinner-neutral',
    white: 'loading-spinner-white',
    current: 'loading-spinner-current'
  }
  return colorMap[props.color]
})

const textSizeClass = computed(() => {
  const textSizeMap = {
    xs: 'loading-text-xs',
    sm: 'loading-text-xs',
    md: 'loading-text',
    lg: 'loading-text-base',
    xl: 'loading-text-base'
  }
  return textSizeMap[props.size]
})
</script>

<!-- Styles handled by /src/styles/components/common/loading-spinner.css -->
