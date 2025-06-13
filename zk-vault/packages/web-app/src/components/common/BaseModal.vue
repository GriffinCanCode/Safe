<template>
  <Teleport to="body">
    <Transition
      name="modal"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="modelValue"
        class="modal-overlay"
        :class="overlayClasses"
        @click="handleOverlayClick"
        @keydown.esc="handleEscape"
      >
        <div
          ref="modalRef"
          class="modal-container"
          :class="containerClasses"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="title ? `${modalId}-title` : undefined"
          :aria-describedby="$slots.default ? `${modalId}-content` : undefined"
          tabindex="-1"
        >
          <!-- Header -->
          <div v-if="$slots.header || title || closable" class="modal-header">
            <div class="modal-header-content">
              <slot name="header">
                <h3
                  v-if="title"
                  :id="`${modalId}-title`"
                  class="modal-title"
                >
                  {{ title }}
                </h3>
              </slot>
            </div>
            
            <button
              v-if="closable"
              type="button"
              class="modal-close"
              @click="close"
              :aria-label="closeLabel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Content -->
          <div
            :id="`${modalId}-content`"
            class="modal-content"
            :class="contentClasses"
          >
            <slot />
          </div>
          
          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="modal-footer"
            :class="footerClasses"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { generateId } from '@/utils/helpers'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  persistent?: boolean
  centered?: boolean
  scrollable?: boolean
  fullscreen?: boolean
  transition?: string
  overlayClass?: string
  containerClass?: string
  contentClass?: string
  footerClass?: string
  closeLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
  closeOnEscape: true,
  persistent: false,
  centered: true,
  scrollable: false,
  fullscreen: false,
  transition: 'modal',
  closeLabel: 'Close modal'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: []
  escape: []
}>()

// State
const modalRef = ref<HTMLElement | null>(null)
const previousActiveElement = ref<HTMLElement | null>(null)
const modalId = generateId('modal')

// Computed
const overlayClasses = computed(() => [
  'modal-overlay-base',
  {
    'modal-overlay-centered': props.centered,
    'modal-overlay-fullscreen': props.fullscreen
  },
  props.overlayClass
])

const containerClasses = computed(() => [
  'modal-container-base',
  `modal-${props.size}`,
  {
    'modal-scrollable': props.scrollable,
    'modal-fullscreen': props.fullscreen
  },
  props.containerClass
])

const contentClasses = computed(() => [
  'modal-content-base',
  {
    'modal-content-scrollable': props.scrollable
  },
  props.contentClass
])

const footerClasses = computed(() => [
  'modal-footer-base',
  props.footerClass
])

// Methods
const close = () => {
  if (!props.persistent) {
    emit('update:modelValue', false)
    emit('close')
  }
}

const handleOverlayClick = (event: MouseEvent) => {
  if (props.closeOnOverlay && event.target === event.currentTarget) {
    close()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (props.closeOnEscape && event.key === 'Escape') {
    emit('escape')
    close()
  }
}

const onEnter = () => {
  emit('open')
  document.body.style.overflow = 'hidden'
  
  // Store current active element and focus modal
  previousActiveElement.value = document.activeElement as HTMLElement
  nextTick(() => {
    modalRef.value?.focus()
  })
}

const onLeave = () => {
  document.body.style.overflow = ''
  
  // Restore focus to previous element
  if (previousActiveElement.value) {
    previousActiveElement.value.focus()
  }
}

// Focus management
const handleTabKey = (event: KeyboardEvent) => {
  if (!modalRef.value || event.key !== 'Tab') return
  
  const focusableElements = modalRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
  
  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault()
      lastElement?.focus()
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }
}

// Watchers
watch(() => props.modelValue, (newValue: boolean) => {
  if (newValue) {
    document.addEventListener('keydown', handleTabKey)
  } else {
    document.removeEventListener('keydown', handleTabKey)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleTabKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Modal overlay */
.modal-overlay {
  @apply fixed inset-0 z-50 overflow-y-auto;
}

.modal-overlay-base {
  @apply bg-neutral-900 bg-opacity-50 backdrop-blur-sm;
}

.modal-overlay-centered {
  @apply flex items-center justify-center min-h-full p-4;
}

.modal-overlay-fullscreen {
  @apply p-0;
}

/* Modal container */
.modal-container {
  @apply relative w-full bg-white rounded-lg shadow-xl;
  @apply focus:outline-none;
}

.modal-container-base {
  @apply flex flex-col max-h-full;
}

/* Size variants */
.modal-xs {
  @apply max-w-xs;
}

.modal-sm {
  @apply max-w-sm;
}

.modal-md {
  @apply max-w-md;
}

.modal-lg {
  @apply max-w-lg;
}

.modal-xl {
  @apply max-w-xl;
}

.modal-full {
  @apply max-w-7xl;
}

.modal-fullscreen {
  @apply w-full h-full max-w-none max-h-none rounded-none;
}

.modal-scrollable {
  @apply max-h-[90vh];
}

/* Modal header */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-neutral-200;
}

.modal-header-content {
  @apply flex-1 min-w-0;
}

.modal-title {
  @apply text-lg font-semibold text-neutral-900 truncate;
}

.modal-close {
  @apply ml-4 p-1 text-neutral-400 hover:text-neutral-600;
  @apply rounded-md transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
}

/* Modal content */
.modal-content-base {
  @apply flex-1 p-6;
}

.modal-content-scrollable {
  @apply overflow-y-auto;
}

/* Modal footer */
.modal-footer-base {
  @apply flex items-center justify-end gap-3 p-6 border-t border-neutral-200;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .modal-container {
    @apply bg-neutral-800;
  }
  
  .modal-header {
    @apply border-neutral-700;
  }
  
  .modal-title {
    @apply text-neutral-100;
  }
  
  .modal-close {
    @apply text-neutral-400 hover:text-neutral-300;
  }
  
  .modal-footer-base {
    @apply border-neutral-700;
  }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  @apply transition-opacity duration-300;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  @apply transition-all duration-300;
}

.modal-enter-from,
.modal-leave-to {
  @apply opacity-0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  @apply opacity-0 scale-95 translate-y-4;
}

.modal-enter-to .modal-container,
.modal-leave-from .modal-container {
  @apply opacity-100 scale-100 translate-y-0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    @apply transition-none;
  }
  
  .modal-close {
    @apply transition-none;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  .modal-container {
    @apply border-2 border-neutral-600;
  }
  
  .modal-header,
  .modal-footer-base {
    @apply border-2;
  }
}
</style>
