import { useEffect, useRef } from 'react'

/**
 * Subtle vertical parallax: the element drifts opposite to the scroll
 * direction as it passes through the viewport. Mutates `transform` directly
 * on the node (no re-renders) and respects `prefers-reduced-motion`.
 */
export function useParallax<T extends HTMLElement>(speed = 0.06) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      const rect = node.getBoundingClientRect()
      if (rect.height === 0) return
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2
      node.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [speed])

  return ref
}
