"use client"

import { useSettingsProfile } from "./useSettingsProfile"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"
import {
  formatInTimezone,
  formatTimeInTimezone,
  formatDateInTimezone,
} from "@/lib/preferences/TimezoneFormattingResolver"

/**
 * Returns the user's preferred timezone (from profile) and formatters.
 * Use for game times, league deadlines, schedule data across Sports App, Bracket, Legacy.
 */
export function useUserTimezone() {
  const { profile } = useSettingsProfile()
  const { language } = useLanguage()
  const timezone = profile?.timezone ?? null

  return {
    timezone,
    formatInTimezone: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatInTimezone(date, timezone, options, language),
    formatTimeInTimezone: (date: Date | string | number) =>
      formatTimeInTimezone(date, timezone, language),
    formatDateInTimezone: (date: Date | string | number) =>
      formatDateInTimezone(date, timezone, language),
  }
}
