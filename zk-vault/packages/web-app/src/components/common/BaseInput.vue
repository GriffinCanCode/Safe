<template>
  <div class="input-wrapper" :class="wrapperClasses">
    <label
      v-if="label"
      :for="inputId"
      class="input-label"
      :class="{ 'required': required }"
    >
      {{ label }}
    </label>
    
    <div class="input-container" :class="containerClasses">
      <component
        v-if="prefixIcon"
        :is="prefixIcon"
        class="input-icon input-icon-prefix"
      />
      
      <input
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :class="inputClasses"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : help ? `${inputId}-help` : undefined"
        v-bind="$attrs"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      
      <component
        v-if="suffixIcon"
        :is="suffixIcon"
        class="input-icon input-icon-suffix"
      />
      
      <button
        v-if="clearable && modelValue && !disabled && !readonly"
        type="button"
        class="input-clear"
        @click="clearInput"
        :aria-label="clearLabel"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <button
        v-if="type === 'password'"
        type="button"
        class="input-toggle-password"
        @click="togglePasswordVisibility"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
      >
        <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L18.464 18.464" />
        </svg>
      </button>
    </div>
    
    <div v-if="error || help" class="input-feedback">
      <p
        v-if="error"
        :id="`${inputId}-error`"
        class="input-error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="help"
        :id="`${inputId}-help`"
        class="input-help"
      >
        {{ help }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { generateId } from '@/utils/helpers'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  label?: string
  placeholder?: string
  help?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  clearable?: boolean
  autocomplete?: string
  prefixIcon?: string | object
  suffixIcon?: string | object
  clearLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  clearLabel: 'Clear input'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  clear: []
}>()

// State
const inputRef = ref<HTMLInputElement | null>(null)
const showPassword = ref(false)
const isFocused = ref(false)
const inputId = generateId('input')

// Computed
const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const wrapperClasses = computed(() => ({
  'input-wrapper-disabled': props.disabled,
  'input-wrapper-error': !!props.error,
  'input-wrapper-focused': isFocused.value
}))

const containerClasses = computed(() => ({
  'input-container-sm': props.size === 'sm',
  'input-container-md': props.size === 'md',
  'input-container-lg': props.size === 'lg',
  'input-container-disabled': props.disabled,
  'input-container-readonly': props.readonly,
  'input-container-error': !!props.error,
  'input-container-focused': isFocused.value
}))

const inputClasses = computed(() => ({
  'input-base': true,
  'input-sm': props.size === 'sm',
  'input-md': props.size === 'md',
  'input-lg': props.size === 'lg',
  'input-with-prefix': !!props.prefixIcon,
  'input-with-suffix': !!props.suffixIcon || props.clearable || props.type === 'password',
  'input-error': !!props.error
}))

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value
  
  if (props.type === 'number') {
    value = target.valueAsNumber || 0
  }
  
  emit('update:modelValue', value)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

const clearInput = () => {
  emit('update:modelValue', '')
  emit('clear')
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

// Expose methods
defineExpose({
  focus,
  blur,
  inputRef
})
</script>

<style scoped>
.input-wrapper {
  @apply w-full;
}

.input-label {
  @apply block text-sm font-medium text-neutral-700 mb-1;
}

.input-label.required::after {
  content: " *";
  @apply text-danger-500;
}

.input-container {
  @apply relative flex items-center;
}

.input-base {
  @apply w-full border border-neutral-300 rounded-md bg-white text-neutral-900;
  @apply focus:border-primary-500 focus:ring-1 focus:ring-primary-500;
  @apply placeholder-neutral-500 transition-all duration-200;
  @apply disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed;
  @apply readonly:bg-neutral-50 readonly:cursor-default;
}

/* Size variants */
.input-sm {
  @apply px-3 py-1.5 text-sm;
}

.input-md {
  @apply px-3 py-2 text-sm;
}

.input-lg {
  @apply px-4 py-3 text-base;
}

/* Icon spacing */
.input-with-prefix {
  @apply pl-10;
}

.input-with-suffix {
  @apply pr-10;
}

.input-with-prefix.input-sm {
  @apply pl-9;
}

.input-with-suffix.input-sm {
  @apply pr-9;
}

.input-with-prefix.input-lg {
  @apply pl-12;
}

.input-with-suffix.input-lg {
  @apply pr-12;
}

/* Error state */
.input-error {
  @apply border-danger-500 focus:border-danger-500 focus:ring-danger-500;
}

/* Icons */
.input-icon {
  @apply absolute w-4 h-4 text-neutral-500;
}

.input-icon-prefix {
  @apply left-3;
}

.input-icon-suffix {
  @apply right-3;
}

.input-container-sm .input-icon-prefix {
  @apply left-2.5;
}

.input-container-sm .input-icon-suffix {
  @apply right-2.5;
}

.input-container-lg .input-icon-prefix {
  @apply left-4;
}

.input-container-lg .input-icon-suffix {
  @apply right-4;
}

/* Clear button */
.input-clear {
  @apply absolute right-3 w-4 h-4 text-neutral-400 hover:text-neutral-600;
  @apply transition-colors duration-200 cursor-pointer;
}

.input-container-sm .input-clear {
  @apply right-2.5;
}

.input-container-lg .input-clear {
  @apply right-4;
}

/* Password toggle */
.input-toggle-password {
  @apply absolute right-3 w-4 h-4 text-neutral-400 hover:text-neutral-600;
  @apply transition-colors duration-200 cursor-pointer;
}

.input-container-sm .input-toggle-password {
  @apply right-2.5;
}

.input-container-lg .input-toggle-password {
  @apply right-4;
}

/* Feedback */
.input-feedback {
  @apply mt-1;
}

.input-error {
  @apply text-sm text-danger-600;
}

.input-help {
  @apply text-sm text-neutral-500;
}

/* Container states */
.input-container-focused {
  @apply ring-1 ring-primary-500;
}

.input-container-error {
  @apply ring-1 ring-danger-500;
}

.input-container-disabled {
  @apply opacity-50;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .input-label {
    @apply text-neutral-300;
  }
  
  .input-base {
    @apply bg-neutral-800 border-neutral-600 text-neutral-100;
    @apply placeholder-neutral-400;
    @apply disabled:bg-neutral-900 disabled:text-neutral-600;
    @apply readonly:bg-neutral-900;
  }
  
  .input-help {
    @apply text-neutral-400;
  }
  
  .input-error {
    @apply text-danger-400;
  }
  
  .input-icon,
  .input-clear,
  .input-toggle-password {
    @apply text-neutral-400 hover:text-neutral-300;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  .input-base {
    @apply border-2;
  }
  
  .input-error {
    @apply border-2 border-danger-500;
  }
}
</style>
