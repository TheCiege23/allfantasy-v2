import "server-only"

import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"
import { DEFAULT_TIMEZONE, isValidTimezone } from "./TimezonePreferenceService"
import { type LanguageCode, resolveLanguage } from "@/lib/i18n/constants"

export interface ServerRenderPreferences {
  timezone: string
  language: LanguageCode
}

export async function resolveServerRenderPreferences(): Promise<ServerRenderPreferences> {
  let language: LanguageCode = "en"
  let timezone = DEFAULT_TIMEZONE

  // DB preference is the lower-priority fallback (may be stale during the
  // async window between a language-toggle click and its PATCH completing).
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string }
    } | null
    const userId = session?.user?.id

    if (userId) {
      const profile = await getSettingsProfile(userId)
      if (profile?.preferredLanguage) {
        language = resolveLanguage(profile.preferredLanguage)
      }
      if (isValidTimezone(profile?.timezone)) {
        timezone = profile.timezone
      }
    }
  } catch {
    // Ignore session/profile failures and fallback to cookie/default preferences.
  }

  // Cookie wins over DB: setStoredLanguage() writes document.cookie synchronously
  // before router.refresh() is called, so the refreshed server render sees the
  // new locale immediately without waiting for the async profile PATCH to complete.
  try {
    const cookieStore = await cookies()
    const cookieLang = cookieStore.get("af_lang")?.value
    if (cookieLang) {
      language = resolveLanguage(cookieLang)
    }
  } catch {
    // Ignore cookie access failures and retain the DB/default preference.
  }

  return { timezone, language }
}
