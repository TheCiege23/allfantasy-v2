import { DEFAULT_SIGNUP_TIMEZONE, SIGNUP_TIMEZONES } from "@/lib/signup/timezones"

const ALLOWED_TIMEZONES = new Set(SIGNUP_TIMEZONES.map((entry) => entry.value))

export function isAllowedSignupTimezone(timezone: unknown): timezone is string {
  return typeof timezone === "string" && ALLOWED_TIMEZONES.has(timezone)
}

export function resolveSignupTimezone(timezone: unknown): string {
  return isAllowedSignupTimezone(timezone) ? timezone : DEFAULT_SIGNUP_TIMEZONE
}
