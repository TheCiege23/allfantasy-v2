/**
 * World Cup i18n helper coverage (Phase 2 — 5 locales).
 *
 * Verifies:
 *  - All 5 supported locales resolve correctly.
 *  - Native display names render in their own script (English, Español,
 *    繁體中文, Filipino, Tiếng Việt).
 *  - Unsupported locales fall back to English.
 *  - Spanish, Traditional Chinese, Filipino, Vietnamese labels match for
 *    representative keys.
 *  - Placeholder interpolation works and leaves unknown placeholders intact.
 *  - Unknown keys return the key string verbatim AND log a dev warning
 *    exactly once per (locale, key).
 *  - Production NODE_ENV path never logs and never reveals the raw key
 *    through a console.warn — falls back to English silently.
 *  - No value in any dictionary leaks an email, user id, or wagering /
 *    betting / sportsbook / DFS language (matches the safety stance
 *    used by the AI helpers).
 *  - All locales have parity — every English key exists in every locale
 *    (avoids accidental English bleed-through under any non-English UI).
 *
 * NOTE: This file imports the helper directly. It does not exercise the
 * React provider, only the pure function surface, so it is fast and
 * stable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getWorldCupLocale,
  getWorldCupLocaleNativeName,
  wcT,
  makeWcT,
  WORLD_CUP_TRANSLATIONS,
  WORLD_CUP_DEFAULT_LOCALE,
  WORLD_CUP_SUPPORTED_LOCALES,
  WORLD_CUP_LOCALE_NATIVE_NAMES,
  _resetWorldCupI18nWarnCache,
} from "@/lib/world-cup/worldCupI18n"

describe("worldCupI18n: getWorldCupLocale", () => {
  it("returns 'en' for unknown / nullish input", () => {
    expect(getWorldCupLocale(undefined)).toBe("en")
    expect(getWorldCupLocale(null)).toBe("en")
    expect(getWorldCupLocale("")).toBe("en")
    expect(getWorldCupLocale("xx")).toBe("en")
    expect(getWorldCupLocale(42 as unknown)).toBe("en")
  })

  it("returns each supported locale verbatim", () => {
    expect(getWorldCupLocale("en")).toBe("en")
    expect(getWorldCupLocale("es")).toBe("es")
    expect(getWorldCupLocale("zh")).toBe("zh")
    expect(getWorldCupLocale("fil")).toBe("fil")
    expect(getWorldCupLocale("vi")).toBe("vi")
  })
})

describe("worldCupI18n: native locale names", () => {
  it("exposes native display names in each locale's own script", () => {
    expect(WORLD_CUP_LOCALE_NATIVE_NAMES.en).toBe("English")
    expect(WORLD_CUP_LOCALE_NATIVE_NAMES.es).toBe("Español")
    expect(WORLD_CUP_LOCALE_NATIVE_NAMES.zh).toBe("繁體中文")
    expect(WORLD_CUP_LOCALE_NATIVE_NAMES.fil).toBe("Filipino")
    expect(WORLD_CUP_LOCALE_NATIVE_NAMES.vi).toBe("Tiếng Việt")
  })

  it("getWorldCupLocaleNativeName returns the native name", () => {
    expect(getWorldCupLocaleNativeName("zh")).toBe("繁體中文")
    expect(getWorldCupLocaleNativeName("vi")).toBe("Tiếng Việt")
  })

  it("getWorldCupLocaleNativeName falls back to English for unknown input", () => {
    expect(getWorldCupLocaleNativeName(undefined)).toBe("English")
    expect(getWorldCupLocaleNativeName("xx")).toBe("English")
  })
})

describe("worldCupI18n: wcT", () => {
  it("returns the English value for an unknown locale", () => {
    const enValue = WORLD_CUP_TRANSLATIONS.en["wc.tab.picks"]
    expect(wcT("xx", "wc.tab.picks")).toBe(enValue)
    expect(wcT(undefined, "wc.tab.picks")).toBe(enValue)
  })

  it("returns the Spanish value when locale is 'es'", () => {
    expect(wcT("es", "wc.tab.picks")).toBe(WORLD_CUP_TRANSLATIONS.es["wc.tab.picks"])
    expect(wcT("es", "wc.tab.groupStage")).toBe("Fase de Grupos")
  })

  it("returns the Traditional Chinese value when locale is 'zh'", () => {
    expect(wcT("zh", "wc.tab.picks")).toBe("淘汰賽")
    expect(wcT("zh", "wc.tab.groupStage")).toBe("小組賽")
  })

  it("returns the Filipino value when locale is 'fil'", () => {
    expect(wcT("fil", "wc.tab.rules")).toBe("Mga Patakaran")
    expect(wcT("fil", "wc.header.testMode")).toBe("Test mode")
  })

  it("returns the Vietnamese value when locale is 'vi'", () => {
    expect(wcT("vi", "wc.tab.picks")).toBe("Vòng loại trực tiếp")
    expect(wcT("vi", "wc.tab.groupStage")).toBe("Vòng bảng")
  })

  it("returns the English value when locale is 'en'", () => {
    expect(wcT("en", "wc.tab.picks")).toBe("Knockouts")
    expect(wcT("en", "wc.tab.groupStage")).toBe("Group Stage")
  })

  it("falls back to the key string when the key is unknown in every locale", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      expect(wcT(locale, "wc.this.key.does.not.exist")).toBe(
        "wc.this.key.does.not.exist"
      )
    }
  })

  it("interpolates {{var}} placeholders from params", () => {
    expect(wcT("en", "wc.lock.untilLockDays", { d: 3, h: 7 })).toBe(
      "3d 7h until picks lock"
    )
    expect(wcT("es", "wc.lock.untilLockDays", { d: 3, h: 7 })).toBe(
      "3d 7h para que cierren los picks"
    )
    // Chinese / Vietnamese have natural-language phrasing around the numbers.
    expect(wcT("zh", "wc.lock.untilLockDays", { d: 3, h: 7 })).toContain("3")
    expect(wcT("vi", "wc.lock.untilLockDays", { d: 3, h: 7 })).toContain("3")
  })

  it("interpolates numeric and string params", () => {
    expect(
      wcT("en", "wc.knockouts.guidance.complete", { done: 5, required: 10 })
    ).toBe("5/10 currently available picks complete.")
    expect(
      wcT("es", "wc.knockouts.guidance.complete", { done: 5, required: 10 })
    ).toBe("5/10 picks disponibles completados.")
    expect(
      wcT("fil", "wc.knockouts.guidance.complete", { done: 5, required: 10 })
    ).toContain("5/10")
  })

  it("leaves unknown placeholders intact for QA visibility", () => {
    expect(wcT("en", "wc.lock.untilLockDays", { d: 1 })).toBe(
      "1d {{h}}h until picks lock"
    )
  })

  it("leaves placeholder intact when the param value is null/undefined", () => {
    expect(
      wcT("en", "wc.lock.untilLockDays", {
        d: null as unknown as number,
        h: 2,
      })
    ).toBe("{{d}}d 2h until picks lock")
  })
})

describe("worldCupI18n: makeWcT", () => {
  it("returns a function bound to the given locale", () => {
    const tEn = makeWcT("en")
    const tEs = makeWcT("es")
    const tZh = makeWcT("zh")
    const tFil = makeWcT("fil")
    const tVi = makeWcT("vi")
    expect(tEn("wc.tab.picks")).toBe("Knockouts")
    expect(tEs("wc.tab.picks")).toBe("Eliminatorias")
    expect(tZh("wc.tab.picks")).toBe("淘汰賽")
    expect(tFil("wc.tab.picks")).toBe("Knockouts")
    expect(tVi("wc.tab.picks")).toBe("Vòng loại trực tiếp")
  })

  it("falls back to English when locale is unknown", () => {
    const tBad = makeWcT(undefined)
    expect(tBad("wc.tab.picks")).toBe("Knockouts")
  })

  it("forwards interpolation params", () => {
    const t = makeWcT("en")
    expect(t("wc.knockouts.guidance.nextPick", { matchNumber: 12 })).toBe(
      "Next pick: Match 12."
    )
  })
})

describe("worldCupI18n: missing-key dev warning behavior", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    _resetWorldCupI18nWarnCache()
  })

  afterEach(() => {
    warnSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it("logs a one-shot warning when a key is missing in a non-English locale", () => {
    process.env.NODE_ENV = "development"
    wcT("es", "wc.totally.missing.key.dev")
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = String(warnSpy.mock.calls[0][0])
    expect(msg).toContain("Missing translation")
    expect(msg).toContain("wc.totally.missing.key.dev")
    expect(msg).toContain("es")
  })

  it("does not double-log the same (locale, key)", () => {
    process.env.NODE_ENV = "development"
    wcT("es", "wc.totally.missing.key.dedupe")
    wcT("es", "wc.totally.missing.key.dedupe")
    wcT("es", "wc.totally.missing.key.dedupe")
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it("logs separately for different locales of the same missing key", () => {
    process.env.NODE_ENV = "development"
    wcT("es", "wc.totally.missing.key.split")
    wcT("zh", "wc.totally.missing.key.split")
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })

  it("does NOT log in production", () => {
    process.env.NODE_ENV = "production"
    wcT("es", "wc.totally.missing.key.prod")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("production fallback still returns a string (key as last resort) — no raw key leak path through warn", () => {
    process.env.NODE_ENV = "production"
    const result = wcT("es", "wc.totally.missing.key.prod.return")
    // Falls back to English; English is also missing → returns the key
    // verbatim. Production should not WARN about this (we asserted above),
    // and callers should not pass unknown keys in production. We still
    // verify it returns a string (never null/undefined).
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })
})

describe("worldCupI18n: safety properties", () => {
  it("no value contains an email address, user id, or @-prefixed handle", () => {
    const emailish = /@[a-z0-9.-]+\.[a-z]{2,}/i
    const userIdish = /\buser[_-]?id\b/i
    const cuidish = /\bcm[a-z0-9]{20,}\b/i
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      for (const [key, value] of Object.entries(dict)) {
        expect(emailish.test(value), `${locale}.${key} should not contain an email address`).toBe(false)
        expect(userIdish.test(value), `${locale}.${key} should not reference user id`).toBe(false)
        expect(cuidish.test(value), `${locale}.${key} should not contain a CUID`).toBe(false)
      }
    }
  })

  it("no value contains wagering / gambling / odds / sportsbook / DFS language", () => {
    const forbidden = [
      /\bbet(ting)?\b/i,
      /\bgambl/i,
      /\bodds\b/i,
      /\bwager/i,
      /\bpayout\b/i,
      /\bparlay/i,
      /\bspread\b/i,
      /\bmoneyline\b/i,
      /\bsportsbook\b/i,
      /\bdfs\b/i,
      /\bdraftkings\b/i,
      /\bfanduel\b/i,
      /\bapuesta/i,
      /\bapostar/i,
      /\bganancia/i,
      /\bdineral/i,
    ]
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      for (const [key, value] of Object.entries(dict)) {
        for (const pattern of forbidden) {
          expect(
            pattern.test(value),
            `${locale}.${key} should not match ${pattern} (got: "${value}")`
          ).toBe(false)
        }
      }
    }
  })

  it("every locale has the same keys as English (parity)", () => {
    const enKeys = Object.keys(WORLD_CUP_TRANSLATIONS.en).sort()
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      if (locale === "en") continue
      const localeKeys = Object.keys(WORLD_CUP_TRANSLATIONS[locale]).sort()
      const missingInLocale = enKeys.filter(
        (k) => !(k in WORLD_CUP_TRANSLATIONS[locale])
      )
      const extraInLocale = localeKeys.filter(
        (k) => !(k in WORLD_CUP_TRANSLATIONS.en)
      )
      expect(
        missingInLocale,
        `Locale "${locale}" is missing keys present in English`
      ).toEqual([])
      expect(
        extraInLocale,
        `Locale "${locale}" has keys not present in English`
      ).toEqual([])
    }
  })

  it("each non-English locale has at least one value that differs from English", () => {
    // Smoke-check that the new locales are not just an English copy.
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      if (locale === "en") continue
      const diffs: string[] = []
      for (const [key, enValue] of Object.entries(WORLD_CUP_TRANSLATIONS.en)) {
        if (WORLD_CUP_TRANSLATIONS[locale][key] !== enValue) {
          diffs.push(key)
        }
      }
      expect(
        diffs.length,
        `Locale "${locale}" should differ from English on most keys`
      ).toBeGreaterThan(60)
    }
  })
})

describe("worldCupI18n: defaults / exports", () => {
  it("default locale is 'en'", () => {
    expect(WORLD_CUP_DEFAULT_LOCALE).toBe("en")
  })

  it("supported locales are exactly ['en','es','zh','fil','vi']", () => {
    expect(WORLD_CUP_SUPPORTED_LOCALES).toEqual(["en", "es", "zh", "fil", "vi"])
  })
})
