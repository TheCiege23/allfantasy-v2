"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  resolveTheme,
  getNextTheme,
  type ThemeId,
} from "@/lib/theme"

export type AppMode = ThemeId

type ThemeCtx = {
  mode: AppMode
  setMode: (m: AppMode) => void
  cycleMode: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof document !== "undefined") {
      const current = document.documentElement.dataset.mode
      return resolveTheme(current)
    }
    return DEFAULT_THEME
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    const resolved = resolveTheme(saved)
    setModeState(resolved)
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.dataset.mode = mode
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {}
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
