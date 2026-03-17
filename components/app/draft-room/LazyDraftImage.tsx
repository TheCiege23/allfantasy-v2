'use client'

import { useState, useEffect, useRef } from 'react'

export type LazyDraftImageProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  /** When true, use Intersection Observer to defer loading until near viewport */
  lazy?: boolean
  /** Root margin for IO (e.g. "100px" to load slightly before visible) */
  rootMargin?: string
  onError?: () => void
}

/**
 * Image that never shows a broken icon: lazy-loads when appropriate and calls onError so parent can show fallback.
 * Mobile and desktop friendly; preserves layout with width/height.
 */
export function LazyDraftImage({
  src,
  alt,
  width,
  height,
  className = '',
  lazy = true,
  rootMargin = '100px',
  onError,
}: LazyDraftImageProps) {
  const [inView, setInView] = useState(false)
  const [errored, setErrored] = useState(false)
  const ref = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!lazy || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true)
      },
      { rootMargin, threshold: 0.01 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [lazy, rootMargin])

  const shouldLoad = inView && src && !errored

  const handleError = () => {
    setErrored(true)
    onError?.()
  }

  return (
    <span
      ref={ref}
      className="inline-block flex-shrink-0"
      style={{ width, height }}
    >
      {!shouldLoad ? (
        <span
          className={`inline-block bg-white/10 ${className}`}
          style={{ width, height }}
          aria-hidden
        />
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`flex-shrink-0 ${className}`}
          loading="lazy"
          decoding="async"
          onError={handleError}
        />
      )}
    </span>
  )
}
