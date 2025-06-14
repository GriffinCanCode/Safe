/**
 * Enhanced Animations Composable
 * Combines useAnimations and useFramerMotion for a unified animation system
 */

import { type Ref } from 'vue'
import { useAnimations } from './useAnimations'
import { useFramerMotion, useMotionElement, motionVariants, type MotionVariants } from './useFramerMotion'

export interface AnimationConfig {
  type: 'vueuse' | 'framer'
  preset?: string
  variants?: MotionVariants
  options?: {
    initial?: string
    animate?: string
    exit?: string
    whileHover?: string
    whileTap?: string
    whileInView?: string
  }
}

/**
 * Enhanced animations composable that provides a unified API
 */
export function useEnhancedAnimations() {
  const { 
    animateIn, 
    animateOnHover, 
    animatePress, 
    createStaggeredList,
    shouldAnimate,
    reducedMotion 
  } = useAnimations()

  // Create animation with automatic system selection
  const createAnimation = (
    element: Ref<HTMLElement | undefined>, 
    config: AnimationConfig
  ) => {
    if (config.type === 'framer' && config.variants) {
      return useMotionElement(element, config.variants, config.options)
    } else {
      return animateIn(element, config.preset as any)
    }
  }

  // Enhanced card hover with multiple animation options
  const createCardHover = (
    element: Ref<HTMLElement | undefined>,
    style: 'subtle' | 'lift' | 'scale' | 'glow' = 'lift'
  ) => {
    if (!shouldAnimate.value) return { onMouseEnter: () => {}, onMouseLeave: () => {} }

    switch (style) {
      case 'lift':
        return useMotionElement(element, motionVariants.cardHover)
      case 'scale':
        return useMotionElement(element, motionVariants.buttonHover)
      case 'subtle':
        return animateOnHover(element)
      case 'glow':
        return {
          onMouseEnter: () => {
            if (element.value) {
              element.value.classList.add('hover-glow')
            }
          },
          onMouseLeave: () => {
            if (element.value) {
              element.value.classList.remove('hover-glow')
            }
          }
        }
      default:
        return animateOnHover(element)
    }
  }

  // Enhanced button press with haptic feedback simulation
  const createButtonPress = (
    element: Ref<HTMLElement | undefined>,
    style: 'scale' | 'press' | 'bounce' = 'scale'
  ) => {
    if (!shouldAnimate.value) return { onMouseDown: () => {}, onMouseUp: () => {} }

    switch (style) {
      case 'scale':
        return useMotionElement(element, motionVariants.buttonHover)
      case 'press':
        return animatePress(element)
      case 'bounce':
        return {
          onMouseDown: () => {
            if (element.value) {
              element.value.classList.add('animate-bounce-in')
            }
          },
          onMouseUp: () => {
            if (element.value) {
              setTimeout(() => {
                element.value?.classList.remove('animate-bounce-in')
              }, 200)
            }
          }
        }
      default:
        return animatePress(element)
    }
  }

  // Page entrance animations
  const createPageEntrance = (
    element: Ref<HTMLElement | undefined>,
    direction: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' = 'fade'
  ) => {
    if (!shouldAnimate.value) return

    const variants: MotionVariants = {
      initial: { opacity: 0 },
      animate: { opacity: 1 }
    }

    switch (direction) {
      case 'slide-up':
        variants.initial = { opacity: 0, y: 50 }
        variants.animate = { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' } }
        break
      case 'slide-left':
        variants.initial = { opacity: 0, x: -50 }
        variants.animate = { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' } }
        break
      case 'slide-right':
        variants.initial = { opacity: 0, x: 50 }
        variants.animate = { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' } }
        break
      case 'scale':
        variants.initial = { opacity: 0, scale: 0.9 }
        variants.animate = { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' } }
        break
      default:
        variants.animate = { opacity: 1, transition: { duration: 0.4 } }
    }

    return useMotionElement(element, variants, {
      initial: 'initial',
      animate: 'animate'
    })
  }

  // Modal animations
  const createModalAnimation = (element: Ref<HTMLElement | undefined>) => {
    const variants: MotionVariants = {
      initial: { opacity: 0, scale: 0.95, y: -20 },
      animate: { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { duration: 0.3, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' }
      },
      exit: { 
        opacity: 0, 
        scale: 0.95, 
        y: -20,
        transition: { duration: 0.2 }
      }
    }

    return useMotionElement(element, variants, {
      initial: 'initial',
      animate: 'animate',
      exit: 'exit'
    })
  }

  // List item stagger with enhanced options
  const createStaggeredEntrance = (
    elements: Ref<HTMLElement[]>
  ) => {
    if (!shouldAnimate.value) return { animateList: () => {} }

    return createStaggeredList(elements)
  }

  // Scroll-triggered animations
  const createScrollAnimation = (
    element: Ref<HTMLElement | undefined>,
    animation: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale' = 'fade'
  ) => {
    if (!shouldAnimate.value) return

    const variants: MotionVariants = {
      initial: { opacity: 0 },
      animate: { opacity: 1 }
    }

    switch (animation) {
      case 'slide-up':
        variants.initial = { opacity: 0, y: 30 }
        variants.animate = { opacity: 1, y: 0, transition: { duration: 0.6 } }
        break
      case 'slide-left':
        variants.initial = { opacity: 0, x: -30 }
        variants.animate = { opacity: 1, x: 0, transition: { duration: 0.6 } }
        break
      case 'slide-right':
        variants.initial = { opacity: 0, x: 30 }
        variants.animate = { opacity: 1, x: 0, transition: { duration: 0.6 } }
        break
      case 'scale':
        variants.initial = { opacity: 0, scale: 0.8 }
        variants.animate = { opacity: 1, scale: 1, transition: { duration: 0.6 } }
        break
    }

    return useMotionElement(element, variants, {
      initial: 'initial',
      whileInView: 'animate'
    })
  }

  // Loading state animations
  const createLoadingAnimation = (element: Ref<HTMLElement | undefined>) => {
    const variants: MotionVariants = {
      loading: {
        opacity: 0.6,
        transition: { duration: 0.2 }
      },
      loaded: {
        opacity: 1,
        transition: { duration: 0.3 }
      }
    }

    return useMotionElement(element, variants, {
      initial: 'loading'
    })
  }

  // Error state animations
  const createErrorAnimation = (element: Ref<HTMLElement | undefined>) => {
    const variants: MotionVariants = {
      error: {
        transform: 'translateX(-10px) translateX(10px) translateX(-10px) translateX(10px) translateX(0px)',
        transition: { duration: 0.5 }
      },
      normal: {
        transform: 'translateX(0px)',
        transition: { duration: 0.3 }
      }
    }

    const { controls } = useFramerMotion(element)

    const triggerError = () => {
      controls.start('error', variants)
      setTimeout(() => {
        controls.start('normal', variants)
      }, 500)
    }

    return { triggerError }
  }

  return {
    // Core functions
    createAnimation,
    createCardHover,
    createButtonPress,
    createPageEntrance,
    createModalAnimation,
    createStaggeredEntrance,
    createScrollAnimation,
    createLoadingAnimation,
    createErrorAnimation,

    // Utilities
    shouldAnimate,
    reducedMotion,

    // Legacy support
    animateIn,
    animateOnHover,
    animatePress,
    createStaggeredList
  }
}

// Animation presets for common use cases
export const animationPresets = {
  // Page transitions
  pageEnter: {
    type: 'framer' as const,
    variants: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    },
    options: { initial: 'initial', animate: 'animate' }
  },

  // Card animations
  cardHover: {
    type: 'framer' as const,
    variants: motionVariants.cardHover,
    options: { initial: 'initial', whileHover: 'whileHover' }
  },

  // Button animations
  buttonPress: {
    type: 'framer' as const,
    variants: motionVariants.buttonHover,
    options: { initial: 'initial', whileHover: 'whileHover', whileTap: 'whileTap' }
  },

  // Modal animations
  modal: {
    type: 'framer' as const,
    variants: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
    },
    options: { initial: 'initial', animate: 'animate', exit: 'exit' }
  }
} 