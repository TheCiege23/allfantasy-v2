"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useThemeMode } from "./ThemeProvider"

export function ModeToggle(props: { className?: string }) {
  const { data: session } = useSession()
  const { mode, cycleMode } = useThemeMode()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const handleClick = useCallback(() => {
    const next = mode === "light" ? "dark" : mode === "dark" ? "legacy" : "light"
    cycleMode()
    if (session?.user) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themePreference: next }),
      }).catch(() => {})
    }
  }, [mode, cycleMode, session?.user])

  const label = mode === "dark" ? "Dark" : mode === "light" ? "Light" : "AF Legacy"
  const title =
    mode === "dark" ? "Dark Mode" : mode === "light" ? "Light Mode" : "AF Legacy Mode"

  return (
    <button
      onClick={handleClick}
      className={
        props.className ??
        "rounded-xl border px-3 py-2 text-sm font-semibold active:scale-[0.98] transition"
      }
      style={{
        color: "var(--text)",
        borderColor: "var(--border)",
        background: "var(--panel)",
      }}
      title={title}
      aria-label={title}
      suppressHydrationWarning
    >
      {mounted ? label : "\u00A0"}
    </button>
  )
}
