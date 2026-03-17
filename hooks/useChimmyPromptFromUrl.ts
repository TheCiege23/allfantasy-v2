'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useCallback } from 'react'

/**
 * Read ?prompt= from URL and return as initial prompt for Chimmy.
 * Clears the param from URL (replaceState) so refresh doesn't re-prefill.
 */
export function useChimmyPromptFromUrl(): string {
  const searchParams = useSearchParams()
  const initial = useRef<string | null>(null)

  const promptParam = searchParams.get('prompt')
  if (promptParam != null && initial.current === null) {
    try {
      initial.current = decodeURIComponent(promptParam).slice(0, 500)
    } catch {
      initial.current = promptParam.slice(0, 500)
    }
  }

  return initial.current ?? ''
}

/**
 * Clear prompt from URL without full navigation (for use after prefill).
 */
export function useClearChimmyPromptFromUrl(): () => void {
  return useCallback(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    if (u.searchParams.has('prompt')) {
      u.searchParams.delete('prompt')
      window.history.replaceState({}, '', u.pathname + u.search)
    }
  }, [])
}
