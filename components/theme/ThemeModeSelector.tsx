"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { interpolateTemplate } from "@/lib/i18n/interpolate"
import { useThemeMode } from "./ThemeProvider"
import { type ThemeId } from "@/lib/theme"
import { setStoredTheme } from "@/lib/preferences/ThemePreferenceService"

const THEME_IDS: ThemeId[] = ["light", "dark", "legacy", "system"]

export function ThemeModeSelector({ className }: { className?: string }) {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const { mode, setMode } = useThemeMode()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const handleSelect = useCallback(
    (t: ThemeId) => {
      setMode(t)
      setStoredTheme(t)
      if (session?.user) {
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themePreference: t }),
        }).catch(() => {})
      }
    },
    [setMode, session?.user],
  )

  return (
    <div className={className}>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
        {t("theme.selectorTitle")}
      </p>
      <div className="flex gap-1">
        {THEME_IDS.map((id) => {
          const label = t(`theme.${id}`)
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={`flex-1 rounded-lg border px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                mounted && mode === id
                  ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-300"
                  : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white/80"
              }`}
              aria-label={interpolateTemplate(t("theme.current"), { label })}
              suppressHydrationWarning
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
