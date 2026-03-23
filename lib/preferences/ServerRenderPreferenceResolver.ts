import "server-only"

import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"
import { DEFAULT_TIMEZONE, isValidTimezone } from "./TimezonePreferenceService"

type PreferenceLanguage = "en" | "es"

export interface ServerRenderPreferences {
  timezone: string
  language: PreferenceLanguage
}

export async function resolveServerRenderPreferences(): Promise<ServerRenderPreferences> {
  let language: PreferenceLanguage = "en"
  let timezone = DEFAULT_TIMEZONE

  try {
    const cookieStore = await cookies()
    const cookieLang = cookieStore.get("af_lang")?.value
    if (cookieLang === "es") {
      language = "es"
    }
  } catch {
    // Ignore cookie access failures and fallback to defaults.
  }

  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string }
    } | null
    const userId = session?.user?.id

    if (userId) {
      const profile = await getSettingsProfile(userId)
      if (profile?.preferredLanguage === "es" || profile?.preferredLanguage === "en") {
        language = profile.preferredLanguage
      }
      if (isValidTimezone(profile?.timezone)) {
        timezone = profile.timezone
      }
    }
  } catch {
    // Ignore session/profile failures and fallback to cookie/default preferences.
  }

  return { timezone, language }
}
