/**
 * Framer Motion-inspired composable for Vue
 * Provides similar APIs and functionality to Framer Motion but optimized for Vue.js
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { useMotion, useReducedMotion } from '@vueuse/motion'
import { animate, timeline, stagger } from 'motion'

// Framer Motion-like variant system
export interface MotionVariants {
  [key: string]: {
    x?: number | string
    y?: number | string
    scale?: number
    rotate?: number
    opacity?: number
    backgroundColor?: string
    borderRadius?: number | string
    boxShadow?: string
    filter?: string
    transform?: string
    transition?: {
      duration?: number
      delay?: number
      ease?: string
      repeat?: number
      repeatType?: 'loop' | 'reverse' | 'mirror'
      stiffness?: number
      damping?: number
      mass?: number
    }
  }
}

// Framer Motion-like spring configurations
export const springConfigs = {
  default: { stiffness: 100, damping: 10, mass: 1 },
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 400, damping: 30, mass: 1 },
  slow: { stiffness: 280, damping: 60, mass: 1 },
  molasses: { stiffness: 280, damping: 120, mass: 1 }
}

// Easing functions similar to Framer Motion
export const easings = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  circIn: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  circOut: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  circInOut: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
  backIn: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  backOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  backInOut: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  anticipate: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
}

/**
 * Main Framer Motion-like composable
 */
export function useFramerMotion(element: Ref<HTMLElement | undefined>) {
  const reducedMotion = useReducedMotion()
  const currentVariant = ref<string>('initial')
  const isAnimating = ref(false)
  
  // Animation controls
  const controls = {
    start: async (variantName: string, variants: MotionVariants) => {
      if (reducedMotion.value || !element.value) return
      
      const variant = variants[variantName]
      if (!variant) return
      
      isAnimating.value = true
      currentVariant.value = variantName
      
      try {
        const animationOptions: any = {
          duration: variant.transition?.duration || 0.3,
          delay: variant.transition?.delay || 0
        }
        
        if (variant.transition?.ease) {
          animationOptions.easing = variant.transition.ease
        }
        
        await animate(element.value, variant, animationOptions)
      } finally {
        isAnimating.value = false
      }
    },
    
    stop: () => {
      if (element.value) {
        // Stop all animations on the element
        element.value.getAnimations().forEach(animation => animation.cancel())
      }
      isAnimating.value = false
    },
    
    set: (variantName: string, variants: MotionVariants) => {
      if (!element.value) return
      
      const variant = variants[variantName]
      if (!variant) return
      
      // Apply styles immediately without animation
      Object.entries(variant).forEach(([key, value]) => {
        if (key !== 'transition' && element.value) {
          const cssProperty = key.replace(/([A-Z])/g, '-$1').toLowerCase()
          element.value.style.setProperty(cssProperty, String(value))
        }
      })
      
      currentVariant.value = variantName
    }
  }
  
  return {
    controls,
    currentVariant: computed(() => currentVariant.value),
    isAnimating: computed(() => isAnimating.value)
  }
}

/**
 * Motion component wrapper (similar to Framer Motion's motion.div)
 */
export function useMotionElement(
  element: Ref<HTMLElement | undefined>,
  variants: MotionVariants,
  options: {
    initial?: string
    animate?: string
    exit?: string
    whileHover?: string
    whileTap?: string
    whileInView?: string
  } = {}
) {
  const { controls } = useFramerMotion(element)
  const reducedMotion = useReducedMotion()
  
  // Set initial state
  onMounted(() => {
    if (options.initial && !reducedMotion.value) {
      controls.set(options.initial, variants)
    }
    
    // Start entrance animation
    if (options.animate && !reducedMotion.value) {
      setTimeout(() => {
        controls.start(options.animate!, variants)
      }, 50)
    }
  })
  
  // Hover animations
  const handleMouseEnter = () => {
    if (options.whileHover && !reducedMotion.value) {
      controls.start(options.whileHover, variants)
    }
  }
  
  const handleMouseLeave = () => {
    if (options.whileHover && options.animate && !reducedMotion.value) {
      controls.start(options.animate, variants)
    }
  }
  
  // Tap animations
  const handleMouseDown = () => {
    if (options.whileTap && !reducedMotion.value) {
      controls.start(options.whileTap, variants)
    }
  }
  
  const handleMouseUp = () => {
    if (options.whileTap && options.whileHover && !reducedMotion.value) {
      controls.start(options.whileHover, variants)
    } else if (options.whileTap && options.animate && !reducedMotion.value) {
      controls.start(options.animate, variants)
    }
  }
  
  // Intersection Observer for whileInView
  let observer: IntersectionObserver | null = null
  
  onMounted(() => {
    if (options.whileInView && element.value && !reducedMotion.value) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              controls.start(options.whileInView!, variants)
            }
          })
        },
        { threshold: 0.1, rootMargin: '50px' }
      )
      
      observer.observe(element.value)
    }
  })
  
  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })
  
  return {
    controls,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp
    }
  }
}

/**
 * Stagger animations (similar to Framer Motion's stagger)
 */
export function useStaggerAnimation(
  elements: Ref<HTMLElement[]>,
  variants: MotionVariants,
  options: {
    staggerDelay?: number
    direction?: 'normal' | 'reverse'
    from?: 'first' | 'last' | 'center' | number
  } = {}
) {
  const reducedMotion = useReducedMotion()
  
  const animateStagger = async (variantName: string) => {
    if (reducedMotion.value || !elements.value.length) return
    
    const variant = variants[variantName]
    if (!variant) return
    
    const staggerDelay = options.staggerDelay || 0.1
    const direction = options.direction || 'normal'
    
    const elementsToAnimate = direction === 'reverse' 
      ? [...elements.value].reverse() 
      : elements.value
    
    await Promise.all(
      elementsToAnimate.map((element, index) => {
        const animationOptions: any = {
          duration: variant.transition?.duration || 0.3,
          delay: (variant.transition?.delay || 0) + (index * staggerDelay)
        }
        
        if (variant.transition?.ease) {
          animationOptions.easing = variant.transition.ease
        }
        
        return animate(element, variant, animationOptions)
      })
    )
  }
  
  return {
    animateStagger
  }
}

/**
 * Layout animations (similar to Framer Motion's layout prop)
 */
export function useLayoutAnimation(element: Ref<HTMLElement | undefined>) {
  onMounted(async () => {
    if (element.value) {
      try {
        // Import autoAnimate dynamically to avoid SSR issues
        const { default: autoAnimate } = await import('@formkit/auto-animate')
        
        if (autoAnimate) {
          autoAnimate(element.value, {
            duration: 300,
            easing: 'ease-out'
          })
        }
      } catch (error) {
        console.warn('Failed to load auto-animate:', error)
      }
    }
  })
}

/**
 * Gesture animations (drag, pan, etc.)
 */
export function useGestureAnimation(
  element: Ref<HTMLElement | undefined>,
  options: {
    drag?: boolean | 'x' | 'y'
    dragConstraints?: { left?: number; right?: number; top?: number; bottom?: number }
    dragElastic?: number
    onDragStart?: () => void
    onDragEnd?: () => void
  } = {}
) {
  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })
  
  let startPos = { x: 0, y: 0 }
  let currentPos = { x: 0, y: 0 }
  
  const handlePointerDown = (event: PointerEvent) => {
    if (!options.drag || !element.value) return
    
    isDragging.value = true
    startPos = { x: event.clientX, y: event.clientY }
    
    element.value.setPointerCapture(event.pointerId)
    options.onDragStart?.()
  }
  
  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging.value || !element.value) return
    
    const deltaX = event.clientX - startPos.x
    const deltaY = event.clientY - startPos.y
    
    let newX = deltaX
    let newY = deltaY
    
    // Apply constraints
    if (options.dragConstraints) {
      const { left, right, top, bottom } = options.dragConstraints
      if (left !== undefined) newX = Math.max(newX, left)
      if (right !== undefined) newX = Math.min(newX, right)
      if (top !== undefined) newY = Math.max(newY, top)
      if (bottom !== undefined) newY = Math.min(newY, bottom)
    }
    
    // Apply drag direction constraints
    if (options.drag === 'x') newY = 0
    if (options.drag === 'y') newX = 0
    
    dragOffset.value = { x: newX, y: newY }
    element.value.style.transform = `translate(${newX}px, ${newY}px)`
  }
  
  const handlePointerUp = (event: PointerEvent) => {
    if (!isDragging.value || !element.value) return
    
    isDragging.value = false
    element.value.releasePointerCapture(event.pointerId)
    
    // Snap back with elastic animation
    if (options.dragElastic) {
      animate(
        element.value,
        { transform: 'translate(0px, 0px)' },
        { duration: 0.3, easing: 'ease-out' }
      )
      dragOffset.value = { x: 0, y: 0 }
    }
    
    options.onDragEnd?.()
  }
  
  onMounted(() => {
    if (element.value && options.drag) {
      element.value.addEventListener('pointerdown', handlePointerDown)
      element.value.addEventListener('pointermove', handlePointerMove)
      element.value.addEventListener('pointerup', handlePointerUp)
      element.value.style.touchAction = 'none'
    }
  })
  
  onUnmounted(() => {
    if (element.value) {
      element.value.removeEventListener('pointerdown', handlePointerDown)
      element.value.removeEventListener('pointermove', handlePointerMove)
      element.value.removeEventListener('pointerup', handlePointerUp)
    }
  })
  
  return {
    isDragging: computed(() => isDragging.value),
    dragOffset: computed(() => dragOffset.value)
  }
}

/**
 * Timeline animations (similar to Framer Motion's useAnimation)
 */
export function useTimelineAnimation() {
  const createTimeline = (animations: Array<{
    element: HTMLElement
    keyframes: any
    options?: any
  }>) => {
    return timeline(
      animations.map(({ element, keyframes, options }) => [
        element,
        keyframes,
        { at: options?.at, ...options }
      ])
    )
  }
  
  return {
    createTimeline
  }
}

// Pre-built variants similar to Framer Motion presets
export const motionVariants = {
  // Fade variants
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  },
  
  // Slide variants
  slideInFromLeft: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.4, ease: easings.easeOut } },
    exit: { x: -100, opacity: 0, transition: { duration: 0.3 } }
  },
  
  slideInFromRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.4, ease: easings.easeOut } },
    exit: { x: 100, opacity: 0, transition: { duration: 0.3 } }
  },
  
  slideInFromTop: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: easings.easeOut } },
    exit: { y: -100, opacity: 0, transition: { duration: 0.3 } }
  },
  
  slideInFromBottom: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.4, ease: easings.easeOut } },
    exit: { y: 100, opacity: 0, transition: { duration: 0.3 } }
  },
  
  // Scale variants
  scaleIn: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: easings.backOut } },
    exit: { scale: 0.8, opacity: 0, transition: { duration: 0.2 } }
  },
  
  // Hover variants
  buttonHover: {
    initial: { scale: 1 },
    whileHover: { scale: 1.05, transition: { duration: 0.2 } },
    whileTap: { scale: 0.95, transition: { duration: 0.1 } }
  },
  
  cardHover: {
    initial: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    whileHover: { 
      y: -8, 
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      transition: { duration: 0.3, ease: easings.easeOut }
    }
  }
} 