'use client'

import { useState, useCallback, useEffect } from 'react'

export interface DraftHelperFloatingWindowState {
  visible: boolean
  position: { x: number; y: number }
  size: { width: number; height: number }
  expandedSections: {
    copilot: boolean
    warRoom: boolean
    intelligence: boolean
    fullWarRoom: boolean
  }
}

const STORAGE_KEY_PREFIX = 'af:draft-helper-floating'

const DEFAULT_STATE: DraftHelperFloatingWindowState = {
  visible: false,
  position: {
    x:
      typeof window !== 'undefined' && window.innerWidth ? window.innerWidth - 450 : 0,
    y:
      typeof window !== 'undefined' && window.innerHeight ? window.innerHeight - 600 : 0,
  },
  size: { width: 400, height: 550 },
  expandedSections: {
    copilot: false,
    warRoom: false,
    intelligence: false,
    fullWarRoom: false,
  },
}

export function useDraftHelperFloatingState() {
  const [state, setState] = useState<DraftHelperFloatingWindowState>(DEFAULT_STATE)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-state`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setState((prev) => ({
          ...prev,
          position: parsed.position || prev.position,
          size: parsed.size || prev.size,
          expandedSections: parsed.expandedSections || prev.expandedSections,
        }))
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsHydrated(true)
  }, [])

  const setPosition = useCallback((position: { x: number; y: number }) => {
    setState((prev) => ({ ...prev, position }))
    try {
      const stored = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-state`) || '{}')
      window.localStorage.setItem(
        `${STORAGE_KEY_PREFIX}-state`,
        JSON.stringify({
          ...stored,
          position,
        })
      )
    } catch {
      // Ignore
    }
  }, [])

  const setSize = useCallback((size: { width: number; height: number }) => {
    setState((prev) => ({ ...prev, size }))
    try {
      const stored = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-state`) || '{}')
      window.localStorage.setItem(
        `${STORAGE_KEY_PREFIX}-state`,
        JSON.stringify({
          ...stored,
          size,
        })
      )
    } catch {
      // Ignore
    }
  }, [])

  const setVisible = useCallback((visible: boolean) => {
    setState((prev) => ({ ...prev, visible }))
  }, [])

  const toggleSection = useCallback((section: keyof DraftHelperFloatingWindowState['expandedSections']) => {
    setState((prev) => ({
      ...prev,
      expandedSections: {
        ...prev.expandedSections,
        [section]: !prev.expandedSections[section],
      },
    }))
    try {
      const stored = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY_PREFIX}-state`) || '{}')
      window.localStorage.setItem(
        `${STORAGE_KEY_PREFIX}-state`,
        JSON.stringify({
          ...stored,
          expandedSections: {
            ...stored.expandedSections,
            [section]: !(stored.expandedSections?.[section] || false),
          },
        })
      )
    } catch {
      // Ignore
    }
  }, [])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
    try {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}-state`)
    } catch {
      // Ignore
    }
  }, [])

  return {
    state,
    setPosition,
    setSize,
    setVisible,
    toggleSection,
    reset,
    isHydrated,
  }
}
