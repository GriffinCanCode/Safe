<template>
  <component
    :is="tag"
    :type="tag === 'button' ? type : undefined"
    :href="tag === 'a' ? href : undefined"
    :to="tag === 'router-link' ? to : undefined"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-busy="loading"
    :aria-disabled="disabled"
    v-bind="$attrs"
    @click="handleClick"
  >
    <LoadingSpinner
      v-if="loading"
      :size="spinnerSize"
      color="current"
      inline
      hide-text
    />
    
    <component
      v-if="icon && !loading"
      :is="icon"
      :class="iconClasses"
    />
    
    <span v-if="$slots.default && (loading || !icon || iconPosition === 'left')" class="button-content">
      <slot />
    </span>
    
    <component
      v-if="icon && !loading && iconPosition === 'right'"
      :is="icon"
      :class="iconClasses"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  tag?: 'button' | 'a' | 'router-link'
  type?: 'button' | 'submit' | 'reset'
  href?: string
  to?: string | object
  disabled?: boolean
  loading?: boolean
  block?: boolean
  rounded?: boolean
  icon?: string | object
  iconPosition?: 'left' | 'right'
  iconOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  tag: 'button',
  type: 'button',
  disabled: false,
  loading: false,
  block: false,
  rounded: false,
  iconPosition: 'left',
  iconOnly: false
})

const emit = defineEmits<{
  click: [event: Event]
}>()

const buttonClasses = computed(() => {
  const classes = [
    'btn',
    `btn-${props.variant}`,
    `btn-${props.size}`,
    {
      'btn-block': props.block,
      'btn-rounded': props.rounded,
      'btn-icon-only': props.iconOnly,
      'btn-loading': props.loading,
      'btn-disabled': props.disabled
    }
  ]
  
  return classes
})

const iconClasses = computed(() => {
  const classes = ['btn-icon']
  
  if (props.iconOnly) {
    classes.push('btn-icon-centered')
  } else if (props.iconPosition === 'right') {
    classes.push('btn-icon-right')
  } else {
    classes.push('btn-icon-left')
  }
  
  return classes
})

const spinnerSize = computed(() => {
  const sizeMap = {
    xs: 'xs',
    sm: 'xs',
    md: 'sm',
    lg: 'sm',
    xl: 'md'
  } as const
  
  return sizeMap[props.size]
})

const handleClick = (event: Event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
/* Base button styles */
.btn {
  @apply inline-flex items-center justify-center gap-2 font-medium transition-all duration-200;
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply border border-transparent;
}

/* Size variants */
.btn-xs {
  @apply px-2 py-1 text-xs rounded;
}

.btn-sm {
  @apply px-3 py-1.5 text-sm rounded-md;
}

.btn-md {
  @apply px-4 py-2 text-sm rounded-md;
}

.btn-lg {
  @apply px-6 py-3 text-base rounded-lg;
}

.btn-xl {
  @apply px-8 py-4 text-lg rounded-lg;
}

/* Variant styles */
.btn-primary {
  @apply bg-primary-600 text-white border-primary-600;
  @apply hover:bg-primary-700 hover:border-primary-700;
  @apply focus-visible:ring-primary-500;
  @apply active:bg-primary-800;
}

.btn-secondary {
  @apply bg-neutral-200 text-neutral-900 border-neutral-200;
  @apply hover:bg-neutral-300 hover:border-neutral-300;
  @apply focus-visible:ring-neutral-500;
  @apply active:bg-neutral-400;
}

.btn-outline {
  @apply bg-transparent text-neutral-700 border-neutral-300;
  @apply hover:bg-neutral-50 hover:border-neutral-400;
  @apply focus-visible:ring-neutral-500;
  @apply active:bg-neutral-100;
}

.btn-ghost {
  @apply bg-transparent text-neutral-700 border-transparent;
  @apply hover:bg-neutral-100;
  @apply focus-visible:ring-neutral-500;
  @apply active:bg-neutral-200;
}

.btn-danger {
  @apply bg-danger-600 text-white border-danger-600;
  @apply hover:bg-danger-700 hover:border-danger-700;
  @apply focus-visible:ring-danger-500;
  @apply active:bg-danger-800;
}

.btn-success {
  @apply bg-success-600 text-white border-success-600;
  @apply hover:bg-success-700 hover:border-success-700;
  @apply focus-visible:ring-success-500;
  @apply active:bg-success-800;
}

.btn-warning {
  @apply bg-warning-600 text-white border-warning-600;
  @apply hover:bg-warning-700 hover:border-warning-700;
  @apply focus-visible:ring-warning-500;
  @apply active:bg-warning-800;
}

/* Block button */
.btn-block {
  @apply w-full;
}

/* Rounded button */
.btn-rounded {
  @apply rounded-full;
}

/* Icon-only button */
.btn-icon-only {
  @apply aspect-square p-0;
}

.btn-icon-only.btn-xs {
  @apply w-6 h-6;
}

.btn-icon-only.btn-sm {
  @apply w-8 h-8;
}

.btn-icon-only.btn-md {
  @apply w-10 h-10;
}

.btn-icon-only.btn-lg {
  @apply w-12 h-12;
}

.btn-icon-only.btn-xl {
  @apply w-16 h-16;
}

/* Icon styles */
.btn-icon {
  @apply shrink-0;
}

.btn-icon-centered {
  @apply w-4 h-4;
}

.btn-icon-left {
  @apply w-4 h-4 -ml-1;
}

.btn-icon-right {
  @apply w-4 h-4 -mr-1;
}

.btn-xs .btn-icon {
  @apply w-3 h-3;
}

.btn-xl .btn-icon {
  @apply w-5 h-5;
}

/* Loading state */
.btn-loading {
  @apply cursor-wait;
}

/* Button content */
.button-content {
  @apply truncate;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .btn-secondary {
    @apply bg-neutral-700 text-neutral-100 border-neutral-700;
    @apply hover:bg-neutral-600 hover:border-neutral-600;
    @apply active:bg-neutral-500;
  }
  
  .btn-outline {
    @apply text-neutral-300 border-neutral-600;
    @apply hover:bg-neutral-800 hover:border-neutral-500;
    @apply active:bg-neutral-700;
  }
  
  .btn-ghost {
    @apply text-neutral-300;
    @apply hover:bg-neutral-800;
    @apply active:bg-neutral-700;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  .btn {
    @apply border-2;
  }
  
  .btn-outline {
    @apply border-current;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .btn {
    @apply transition-none;
  }
}
</style>
