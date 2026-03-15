"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import { useThemeMode } from "@/components/theme/ThemeProvider"
import { parseProfileForSync } from "@/lib/preferences/UniversalPreferenceSyncService"
import { setStoredLanguage } from "@/lib/preferences/LanguagePreferenceService"
import { setStoredTheme } from "@/lib/preferences/ThemePreferenceService"
import { resolveTheme } from "@/lib/preferences/ThemeResolver"
import { resolveLanguage } from "@/lib/preferences/LocalizedRouteShellResolver"

/**
 * When the user is authenticated, sync profile preferences (language, theme, timezone) from server to client.
 * Applies to LanguageProvider, ThemeProvider, and localStorage so preferences persist across reload and match server.
 */
export default function SyncProfilePreferences() {
  const { data: session, status } = useSession()
  const { setLanguage } = useLanguage()
  const { setMode } = useThemeMode()
  const syncedRef = useRef(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      syncedRef.current = false
      return
    }
    if (status !== "authenticated" || !session?.user || syncedRef.current) return
    syncedRef.current = true

    fetch("/api/user/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        const { preferredLanguage, themePreference } = parseProfileForSync(data)

        const lang = resolveLanguage(preferredLanguage)
        setLanguage(lang)
        setStoredLanguage(lang)

        const theme = resolveTheme(themePreference)
        setMode(theme)
        setStoredTheme(theme)
      })
      .catch(() => {})
  }, [status, session?.user, setLanguage, setMode])

  return null
}
