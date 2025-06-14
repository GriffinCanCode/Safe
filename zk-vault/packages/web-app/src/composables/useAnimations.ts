/**
 * Animation Composable
 * Integrates VueUse Motion with our custom animation system
 * Optimized for performance and accessibility
 */

import { useMotion, useReducedMotion } from '@vueuse/motion'
import { ref, computed, type Ref } from 'vue'

// Animation presets optimized for performance
export const animationPresets = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, x: 20 },
    enter: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 300,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  },
  
  pageExit: {
    initial: { opacity: 1, x: 0 },
    leave: { 
      opacity: 0, 
      x: -20,
      transition: {
        duration: 200,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  },

  // Modal animations
  modalEnter: {
    initial: { opacity: 0, scale: 0.95 },
    enter: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 300,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  },

  // Card animations
  cardHover: {
    initial: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    hovered: { 
      y: -4, 
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      transition: {
        duration: 300,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  },

  // Button animations
  buttonPress: {
    initial: { scale: 1 },
    pressed: { 
      scale: 0.98,
      transition: {
        duration: 100,
        ease: 'easeOut'
      }
    }
  },

  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    enter: { 
      opacity: 1,
      transition: {
        duration: 200,
        ease: 'easeOut'
      }
    }
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 30 },
    enter: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 300,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },

  // Stagger animations
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    enter: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 500,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }
}

/**
 * Main animation composable
 */
export function useAnimations() {
  const reducedMotion = useReducedMotion()
  
  // Create motion instance with accessibility support
  const createMotion = (element: Ref<HTMLElement | undefined>, preset: keyof typeof animationPresets) => {
    const motionPreset = animationPresets[preset]
    
    // Disable animations if user prefers reduced motion
    const finalPreset = computed(() => {
      if (reducedMotion.value) {
        return {
          initial: motionPreset.initial,
          enter: { ...motionPreset.initial, transition: { duration: 0 } }
        }
      }
      return motionPreset
    })
    
    return useMotion(element, finalPreset.value)
  }

  // Utility functions
  const animateIn = (element: Ref<HTMLElement | undefined>, preset: keyof typeof animationPresets = 'fadeIn') => {
    return createMotion(element, preset)
  }

  const animateOnHover = (element: Ref<HTMLElement | undefined>) => {
    const motion = createMotion(element, 'cardHover')
    
    const onMouseEnter = () => {
      if (!reducedMotion.value && motion.variant) {
        motion.variant.value = 'hovered' as any
      }
    }
    
    const onMouseLeave = () => {
      if (motion.variant) {
        motion.variant.value = 'initial' as any
      }
    }
    
    return { onMouseEnter, onMouseLeave }
  }

  const animatePress = (element: Ref<HTMLElement | undefined>) => {
    const motion = createMotion(element, 'buttonPress')
    
    const onMouseDown = () => {
      if (!reducedMotion.value && motion.variant) {
        motion.variant.value = 'pressed' as any
      }
    }
    
    const onMouseUp = () => {
      if (motion.variant) {
        motion.variant.value = 'initial' as any
      }
    }
    
    return { onMouseDown, onMouseUp }
  }

  // Stagger animation helper
  const createStaggeredList = (items: Ref<HTMLElement[]>) => {
    const staggerDelay = 100 // ms between each item
    
    const animateList = () => {
      if (reducedMotion.value) return
      
      items.value.forEach((item, index) => {
        const { variant } = useMotion(ref(item), {
          initial: { opacity: 0, y: 20 },
          enter: { 
            opacity: 1, 
            y: 0,
            transition: {
              duration: 500,
              delay: index * staggerDelay,
              ease: [0.4, 0, 0.2, 1]
            }
          }
        })
        
        setTimeout(() => {
          variant.value = 'enter' as any
        }, 50)
      })
    }
    
    return { animateList }
  }

  // Performance monitoring
  const performanceMode = ref<'auto' | 'reduced' | 'disabled'>('auto')
  
  const setPerformanceMode = (mode: 'auto' | 'reduced' | 'disabled') => {
    performanceMode.value = mode
  }

  // Check if animations should be disabled based on performance
  const shouldAnimate = computed(() => {
    if (performanceMode.value === 'disabled') return false
    if (performanceMode.value === 'reduced') return false
    if (reducedMotion.value) return false
    return true
  })

  return {
    // Core functions
    animateIn,
    animateOnHover,
    animatePress,
    createStaggeredList,
    createMotion,
    
    // Utilities
    shouldAnimate,
    reducedMotion,
    performanceMode,
    setPerformanceMode,
    
    // Presets
    presets: animationPresets
  }
}

/**
 * Page transition composable
 */
export function usePageTransitions() {
  const { createMotion, shouldAnimate } = useAnimations()
  
  const pageElement = ref<HTMLElement>()
  
  const setupPageTransition = () => {
    if (!shouldAnimate.value) return
    
    return createMotion(pageElement, 'pageEnter')
  }
  
  return {
    pageElement,
    setupPageTransition
  }
}

/**
 * Loading animation composable
 */
export function useLoadingAnimations() {
  const isLoading = ref(false)
  const loadingElement = ref<HTMLElement>()
  
  const startLoading = () => {
    isLoading.value = true
  }
  
  const stopLoading = () => {
    isLoading.value = false
  }
  
  return {
    isLoading,
    loadingElement,
    startLoading,
    stopLoading
  }
}

/**
 * Intersection Observer animation composable
 */
export function useScrollAnimations() {
  const { animateIn, shouldAnimate } = useAnimations()
  
  const observeElement = (element: Ref<HTMLElement | undefined>, preset: keyof typeof animationPresets = 'slideUp') => {
    if (!shouldAnimate.value) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const motion = animateIn(element, preset)
            if (motion.variant) {
              motion.variant.value = 'enter' as any
            }
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )
    
    if (element.value) {
      observer.observe(element.value)
    }
    
    return observer
  }
  
  return {
    observeElement
  }
} 