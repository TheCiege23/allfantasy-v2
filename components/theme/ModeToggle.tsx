"use client"

import React, { useCallback } from "react"
import { useSession } from "next-auth/react"
import { useThemeMode } from "./ThemeProvider"
import { getNextTheme } from "@/lib/theme"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { interpolateTemplate } from "@/lib/i18n/interpolate"

export function ModeToggle(props: { className?: string }) {
  const { data: session } = useSession()
  const { mode, cycleMode } = useThemeMode()
  const { t } = useLanguage()

  const handleClick = useCallback(() => {
    const next = getNextTheme(mode)
    cycleMode()
    if (session?.user) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themePreference: next }),
      }).catch(() => {})
    }
  }, [mode, cycleMode, session?.user])

  const label = t(`theme.${mode}`)
  const title = interpolateTemplate(t("theme.current"), { label })

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
      {label}
    </button>
  )
}
