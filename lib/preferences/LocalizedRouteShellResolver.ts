/**
 * Resolve locale/language for route shells and server components.
 * Client-side language lives in LanguageProviderClient; this provides constants and validation.
 */

import type { LanguageCode } from "./types"

export const SUPPORTED_LOCALES: LanguageCode[] = ["en", "es"]

export function isValidLanguage(value: string | null | undefined): value is LanguageCode {
  return value === "en" || value === "es"
}

export function resolveLanguage(value: string | null | undefined): LanguageCode {
  if (value === "en" || value === "es") return value
  return "en"
}
