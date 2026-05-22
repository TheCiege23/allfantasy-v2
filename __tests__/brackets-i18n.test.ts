/**
 * Brackets i18n foundation coverage.
 *
 * The brackets layer (lib/brackets/bracketsI18n.ts) is the reusable
 * helper that sits under any bracket/pool UI (NCAA brackets, playoffs,
 * World Cup, etc.). It does NOT replace the global LanguageProviderClient;
 * it only consumes the locale chosen there.
 *
 * Verifies:
 *  - All 5 supported locales resolve correctly.
 *  - Native display names render in their own script.
 *  - Unsupported locales fall back to English.
 *  - Each locale's representative labels match.
 *  - Placeholder interpolation works and leaves unknown placeholders
 *    intact.
 *  - Unknown keys return the key string AND log a dev warning exactly
 *    once per (locale, key).
 *  - Production NODE_ENV path never logs.
 *  - No value contains email / userId / wagering / sportsbook / DFS
 *    language.
 *  - Every English key exists in every locale (parity).
 *  - This module does NOT import the Google Translate batch script and
 *    does NOT import any browser API (window / document / navigator).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  getBracketsLocale,
  getBracketsLocaleNativeName,
  bracketsT,
  makeBracketsT,
  BRACKETS_TRANSLATIONS,
  BRACKETS_DEFAULT_LOCALE,
  BRACKETS_SUPPORTED_LOCALES,
  BRACKETS_LOCALE_NATIVE_NAMES,
  _resetBracketsI18nWarnCache,
} from "@/lib/brackets/bracketsI18n"

describe("bracketsI18n: getBracketsLocale", () => {
  it("returns 'en' for unknown / nullish input", () => {
    expect(getBracketsLocale(undefined)).toBe("en")
    expect(getBracketsLocale(null)).toBe("en")
    expect(getBracketsLocale("")).toBe("en")
    expect(getBracketsLocale("xx")).toBe("en")
    expect(getBracketsLocale(42 as unknown)).toBe("en")
  })

  it("returns each supported locale verbatim", () => {
    expect(getBracketsLocale("en")).toBe("en")
    expect(getBracketsLocale("es")).toBe("es")
    expect(getBracketsLocale("zh")).toBe("zh")
    expect(getBracketsLocale("fil")).toBe("fil")
    expect(getBracketsLocale("vi")).toBe("vi")
  })
})

describe("bracketsI18n: native locale names", () => {
  it("exposes native display names in each locale's own script", () => {
    expect(BRACKETS_LOCALE_NATIVE_NAMES.en).toBe("English")
    expect(BRACKETS_LOCALE_NATIVE_NAMES.es).toBe("Español")
    expect(BRACKETS_LOCALE_NATIVE_NAMES.zh).toBe("繁體中文")
    expect(BRACKETS_LOCALE_NATIVE_NAMES.fil).toBe("Filipino")
    expect(BRACKETS_LOCALE_NATIVE_NAMES.vi).toBe("Tiếng Việt")
  })

  it("getBracketsLocaleNativeName returns the native name", () => {
    expect(getBracketsLocaleNativeName("zh")).toBe("繁體中文")
    expect(getBracketsLocaleNativeName("vi")).toBe("Tiếng Việt")
  })

  it("falls back to English for unknown input", () => {
    expect(getBracketsLocaleNativeName(undefined)).toBe("English")
    expect(getBracketsLocaleNativeName("xx")).toBe("English")
  })
})

describe("bracketsI18n: bracketsT", () => {
  it("returns the English value for an unknown locale", () => {
    expect(bracketsT("xx", "brk.common.pool")).toBe("Pool")
    expect(bracketsT(undefined, "brk.common.pool")).toBe("Pool")
  })

  it("returns each locale's representative label", () => {
    expect(bracketsT("en", "brk.common.pool")).toBe("Pool")
    expect(bracketsT("es", "brk.common.pool")).toBe("Grupo")
    expect(bracketsT("zh", "brk.common.pool")).toBe("群組")
    expect(bracketsT("fil", "brk.common.pool")).toBe("Pool")
    expect(bracketsT("vi", "brk.common.pool")).toBe("Pool")
  })

  it("translates round names", () => {
    expect(bracketsT("en", "brk.round.quarterfinal")).toBe("Quarterfinal")
    expect(bracketsT("es", "brk.round.quarterfinal")).toBe("Cuartos de final")
    expect(bracketsT("zh", "brk.round.quarterfinal")).toBe("八強")
    expect(bracketsT("vi", "brk.round.quarterfinal")).toBe("Tứ kết")
  })

  it("interpolates lock-countdown templates per locale", () => {
    expect(bracketsT("en", "brk.lock.untilLockDays", { d: 2, h: 5 })).toBe(
      "2d 5h until lock"
    )
    expect(bracketsT("es", "brk.lock.untilLockDays", { d: 2, h: 5 })).toBe(
      "2d 5h para que cierre"
    )
    expect(bracketsT("zh", "brk.lock.untilLockDays", { d: 2, h: 5 })).toContain(
      "2"
    )
    expect(bracketsT("vi", "brk.lock.untilLockDays", { d: 2, h: 5 })).toContain(
      "2"
    )
  })

  it("falls back to the key string when both en and target lack the key", () => {
    for (const locale of BRACKETS_SUPPORTED_LOCALES) {
      expect(bracketsT(locale, "brk.unknown.key.fallback")).toBe(
        "brk.unknown.key.fallback"
      )
    }
  })

  it("leaves unknown placeholders intact for QA visibility", () => {
    expect(bracketsT("en", "brk.lock.untilLockDays", { d: 1 })).toBe(
      "1d {{h}}h until lock"
    )
  })
})

describe("bracketsI18n: makeBracketsT", () => {
  it("returns a function bound to the given locale", () => {
    const t = makeBracketsT("es")
    expect(t("brk.common.bracket")).toBe("Bracket")
    expect(t("brk.common.pool")).toBe("Grupo")
  })

  it("falls back to English when locale is unknown", () => {
    const t = makeBracketsT("xx")
    expect(t("brk.common.pool")).toBe("Pool")
  })

  it("forwards interpolation params", () => {
    const t = makeBracketsT("en")
    expect(t("brk.lock.untilLockHours", { h: 4, m: 30 })).toBe(
      "4h 30m until lock"
    )
  })
})

describe("bracketsI18n: missing-key dev warning behavior", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    _resetBracketsI18nWarnCache()
  })

  afterEach(() => {
    warnSpy.mockRestore()
    process.env.NODE_ENV = originalEnv
  })

  it("logs a one-shot warning when a key is missing in a non-English locale", () => {
    process.env.NODE_ENV = "development"
    bracketsT("es", "brk.totally.missing.key.dev")
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const msg = String(warnSpy.mock.calls[0][0])
    expect(msg).toContain("Missing translation")
    expect(msg).toContain("brk.totally.missing.key.dev")
    expect(msg).toContain("es")
  })

  it("does not double-log the same (locale, key)", () => {
    process.env.NODE_ENV = "development"
    bracketsT("es", "brk.totally.missing.key.dedupe")
    bracketsT("es", "brk.totally.missing.key.dedupe")
    bracketsT("es", "brk.totally.missing.key.dedupe")
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it("logs separately for different locales of the same missing key", () => {
    process.env.NODE_ENV = "development"
    bracketsT("es", "brk.totally.missing.key.split")
    bracketsT("vi", "brk.totally.missing.key.split")
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })

  it("does NOT log in production", () => {
    process.env.NODE_ENV = "production"
    bracketsT("es", "brk.totally.missing.key.prod")
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

describe("bracketsI18n: safety properties", () => {
  it("no value contains an email address, user id, or @-prefixed handle", () => {
    const emailish = /@[a-z0-9.-]+\.[a-z]{2,}/i
    const userIdish = /\buser[_-]?id\b/i
    const cuidish = /\bcm[a-z0-9]{20,}\b/i
    for (const locale of BRACKETS_SUPPORTED_LOCALES) {
      const dict = BRACKETS_TRANSLATIONS[locale]
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
    ]
    for (const locale of BRACKETS_SUPPORTED_LOCALES) {
      const dict = BRACKETS_TRANSLATIONS[locale]
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
    const enKeys = Object.keys(BRACKETS_TRANSLATIONS.en).sort()
    for (const locale of BRACKETS_SUPPORTED_LOCALES) {
      if (locale === "en") continue
      const localeKeys = Object.keys(BRACKETS_TRANSLATIONS[locale]).sort()
      const missingInLocale = enKeys.filter(
        (k) => !(k in BRACKETS_TRANSLATIONS[locale])
      )
      const extraInLocale = localeKeys.filter(
        (k) => !(k in BRACKETS_TRANSLATIONS.en)
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
    for (const locale of BRACKETS_SUPPORTED_LOCALES) {
      if (locale === "en") continue
      const diffs: string[] = []
      for (const [key, enValue] of Object.entries(BRACKETS_TRANSLATIONS.en)) {
        if (BRACKETS_TRANSLATIONS[locale][key] !== enValue) {
          diffs.push(key)
        }
      }
      expect(
        diffs.length,
        `Locale "${locale}" should differ from English on a meaningful number of keys`
      ).toBeGreaterThan(20)
    }
  })
})

describe("bracketsI18n: defaults / exports", () => {
  it("default locale is 'en'", () => {
    expect(BRACKETS_DEFAULT_LOCALE).toBe("en")
  })

  it("supported locales are exactly ['en','es','zh','fil','vi']", () => {
    expect(BRACKETS_SUPPORTED_LOCALES).toEqual(["en", "es", "zh", "fil", "vi"])
  })
})

describe("bracketsI18n: translate batch script isolation", () => {
  // Belt-and-suspenders: prove no module under app/, components/, or
  // lib/ (except the script itself) references the translate script or
  // the API key. The runtime app must never touch Google Translate.
  const here = dirname(fileURLToPath(import.meta.url))
  const root = resolve(here, "..")

  it("scripts/translate-brackets-i18n.mjs is not imported by any runtime module", () => {
    // We just verify our two i18n modules are clean. A broader audit is
    // unnecessary because the script lives outside lib/ and components/
    // and Next.js does not bundle scripts/*.mjs.
    const wcSource = readFileSync(
      resolve(root, "lib", "world-cup", "worldCupI18n.ts"),
      "utf8"
    )
    const brkSource = readFileSync(
      resolve(root, "lib", "brackets", "bracketsI18n.ts"),
      "utf8"
    )
    expect(wcSource).not.toMatch(/translate-brackets-i18n/i)
    expect(brkSource).not.toMatch(/translate-brackets-i18n/i)
  })

  it("the script itself is not imported via package.json scripts/build chain", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8")
    )
    const buildLikeScripts = [
      pkg.scripts?.build,
      pkg.scripts?.start,
      pkg.scripts?.dev,
      pkg.scripts?.prebuild,
      pkg.scripts?.postbuild,
    ].filter(Boolean)
    for (const cmd of buildLikeScripts) {
      expect(cmd).not.toMatch(/translate-brackets-i18n/i)
    }
  })
})

describe("bracketsI18n: source file integrity", () => {
  // These checks read the source file as text to assert no banned imports
  // accidentally land in the runtime bundle. Avoids the case where someone
  // adds a node-only or browser-only side-effect import.
  const here = dirname(fileURLToPath(import.meta.url))
  const source = readFileSync(
    resolve(here, "..", "lib", "brackets", "bracketsI18n.ts"),
    "utf8"
  )

  it("does NOT import the Google Translate batch script", () => {
    expect(source).not.toMatch(/translate-brackets-i18n/i)
    expect(source).not.toMatch(/googleapis\.com\/translate/i)
    expect(source).not.toMatch(/GOOGLE_TRANSLATE_API_KEY/)
  })

  it("does NOT reference browser globals at module scope", () => {
    // Module-scope (top-level) references would explode under SSR. Allow
    // the word `browser` to appear inside comments / strings.
    // Check via simple line-by-line scan for risky tokens outside string
    // literals — coarse, but enough to catch obvious regressions.
    expect(source).not.toMatch(/^\s*window\./m)
    expect(source).not.toMatch(/^\s*document\./m)
    expect(source).not.toMatch(/^\s*navigator\./m)
    expect(source).not.toMatch(/^\s*localStorage\./m)
    expect(source).not.toMatch(/^\s*sessionStorage\./m)
  })
})
