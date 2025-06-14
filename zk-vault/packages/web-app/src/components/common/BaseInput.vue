<template>
  <div class="input-wrapper" :class="wrapperClasses">
    <label v-if="label" :for="inputId" class="input-label" :class="{ required: required }">
      {{ label }}
    </label>

    <div class="input-container" :class="containerClasses">
      <component v-if="prefixIcon" :is="prefixIcon" class="input-icon input-icon-prefix" />

      <input
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="inputClasses"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : help ? `${inputId}-help` : undefined"
        v-bind="{ ...$attrs, ...(autocomplete ? { autocomplete } : {}) }"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />

      <component v-if="suffixIcon" :is="suffixIcon" class="input-icon input-icon-suffix" />

      <button
        v-if="clearable && modelValue && !disabled && !readonly"
        type="button"
        class="input-clear"
        @click="clearInput"
        :aria-label="clearLabel"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <button
        v-if="type === 'password'"
        type="button"
        class="input-toggle-password"
        @click="togglePasswordVisibility"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
      >
        <svg
          v-if="!showPassword"
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L18.464 18.464"
          />
        </svg>
      </button>
    </div>

    <div v-if="error || help" class="input-feedback">
      <p v-if="error" :id="`${inputId}-error`" class="input-error" role="alert">
        {{ error }}
      </p>
      <p v-else-if="help" :id="`${inputId}-help`" class="input-help">
        {{ help }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { generateId } from '@/utils/helpers';

interface Props {
  modelValue?: string | number;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  label?: string;
  placeholder?: string;
  help?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  clearable?: boolean;
  autocomplete?: string;
  prefixIcon?: string | object;
  suffixIcon?: string | object;
  clearLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  clearLabel: 'Clear input',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  keydown: [event: KeyboardEvent];
  clear: [];
}>();

// State
const inputRef = ref<HTMLInputElement | null>(null);
const showPassword = ref(false);
const isFocused = ref(false);
const inputId = generateId('input');

// Computed
const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password';
  }
  return props.type;
});

const wrapperClasses = computed(() => ({
  'input-wrapper-disabled': props.disabled,
  'input-wrapper-error': !!props.error,
  'input-wrapper-focused': isFocused.value,
}));

const containerClasses = computed(() => ({
  'input-container-sm': props.size === 'sm',
  'input-container-md': props.size === 'md',
  'input-container-lg': props.size === 'lg',
  'input-container-disabled': props.disabled,
  'input-container-readonly': props.readonly,
  'input-container-error': !!props.error,
  'input-container-focused': isFocused.value,
}));

const inputClasses = computed(() => ({
  'input-base': true,
  'input-sm': props.size === 'sm',
  'input-md': props.size === 'md',
  'input-lg': props.size === 'lg',
  'input-with-prefix': !!props.prefixIcon,
  'input-with-suffix': !!props.suffixIcon || props.clearable || props.type === 'password',
  'input-error': !!props.error,
}));

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value: string | number = target.value;

  if (props.type === 'number') {
    value = target.valueAsNumber || 0;
  }

  emit('update:modelValue', value);
};

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true;
  emit('focus', event);
};

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false;
  emit('blur', event);
};

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event);
};

const clearInput = () => {
  emit('update:modelValue', '');
  emit('clear');
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

const focus = () => {
  inputRef.value?.focus();
};

const blur = () => {
  inputRef.value?.blur();
};

// Expose methods
defineExpose({
  focus,
  blur,
  inputRef,
});
</script>

<style scoped>
/* Component styles are handled by /src/styles/components/common/inputs.css */
</style>
