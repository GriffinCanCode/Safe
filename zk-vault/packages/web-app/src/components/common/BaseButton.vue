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
    <LoadingSpinner v-if="loading" :size="spinnerSize" color="current" inline hide-text />

    <component v-if="icon && !loading" :is="icon" :class="iconClasses" />

    <span
      v-if="$slots.default && (loading || !icon || iconPosition === 'left')"
      class="button-content"
    >
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
import { computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tag?: 'button' | 'a' | 'router-link';
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  to?: string | object;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  rounded?: boolean;
  icon?: string | object;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
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
  iconOnly: false,
});

const emit = defineEmits<{
  click: [event: Event];
}>();

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
      'btn-disabled': props.disabled,
    },
  ];

  return classes;
});

const iconClasses = computed(() => {
  const classes = ['btn-icon'];

  if (props.iconOnly) {
    classes.push('btn-icon-centered');
  } else if (props.iconPosition === 'right') {
    classes.push('btn-icon-right');
  } else {
    classes.push('btn-icon-left');
  }

  return classes;
});

const spinnerSize = computed(() => {
  const sizeMap = {
    xs: 'xs',
    sm: 'xs',
    md: 'sm',
    lg: 'sm',
    xl: 'md',
  } as const;

  return sizeMap[props.size];
});

const handleClick = (event: Event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<style scoped>
/* Component styles are handled by /src/styles/components/common/buttons.css */
</style>
