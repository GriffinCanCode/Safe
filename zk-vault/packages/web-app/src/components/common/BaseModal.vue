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
          :aria-labelledby="title ? `${modalId}-title` : ''"
          :aria-describedby="$slots.default ? `${modalId}-content` : ''"
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
              :aria-label="closeLabel || 'Close modal'"
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
  'modal-overlay',
  props.overlayClass
])

const containerClasses = computed(() => [
  'modal-container',
  `size-${props.size}`,
  {
    'scrollable': props.scrollable,
    'fullscreen': props.fullscreen
  },
  props.containerClass
])

const contentClasses = computed(() => [
  'modal-body',
  {
    'scrollable': props.scrollable
  },
  props.contentClass
])

const footerClasses = computed(() => [
  'modal-footer',
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

<!-- CSS classes are now defined in /styles/components/common/modals.css -->
