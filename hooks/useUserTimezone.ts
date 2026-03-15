"use client"

import { useSettingsProfile } from "./useSettingsProfile"
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
  const timezone = profile?.timezone ?? null

  return {
    timezone,
    formatInTimezone: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatInTimezone(date, timezone, options),
    formatTimeInTimezone: (date: Date | string | number) =>
      formatTimeInTimezone(date, timezone),
    formatDateInTimezone: (date: Date | string | number) =>
      formatDateInTimezone(date, timezone),
  }
}
