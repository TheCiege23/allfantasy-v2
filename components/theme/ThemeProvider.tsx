"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  normalizeStoredTheme,
  getNextTheme,
  type ThemeId,
} from "@/lib/theme"
import { setStoredTheme } from "@/lib/preferences/ThemePreferenceService"
import { applyThemeToDocument } from "@/lib/preferences/HtmlPreferenceSync"

export type AppMode = ThemeId

type ThemeCtx = {
  mode: AppMode
  setMode: (m: AppMode) => void
  cycleMode: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

/** SSR-safe: match <html data-mode> from server; localStorage applied in useEffect. */
function readInitialModeFromDocument(): AppMode {
  if (typeof document !== "undefined") {
    const current = document.documentElement.dataset.mode
    if (current === "light" || current === "dark" || current === "legacy") {
      return current
    }
  }
  return DEFAULT_THEME
}

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(readInitialModeFromDocument)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
      setModeState(normalizeStoredTheme(saved))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      setModeState(normalizeStoredTheme(event.newValue))
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  /** When theme is System, repaint when OS light/dark preference changes. */
  useEffect(() => {
    if (typeof window === "undefined" || mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const onChange = () => {
      applyThemeToDocument("system")
    }
    mq.addEventListener("change", onChange)
    applyThemeToDocument("system")
    return () => mq.removeEventListener("change", onChange)
  }, [mode])

  useEffect(() => {
    if (typeof document === "undefined") return
    setStoredTheme(mode)
  }, [mode])

  const api = useMemo<ThemeCtx>(() => {
    return {
      mode,
      setMode: (m) => setModeState(m),
      cycleMode: () => setModeState((prev) => getNextTheme(prev)),
    }
  }, [mode])

  return <Ctx.Provider value={api}>{props.children}</Ctx.Provider>
}

export function useThemeMode() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useThemeMode must be used inside ThemeProvider")
  return v
}
