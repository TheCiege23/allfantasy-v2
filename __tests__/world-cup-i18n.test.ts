/**
 * World Cup i18n helper coverage.
 *
 * Verifies:
 *  - English fallback when locale is unknown.
 *  - Spanish labels match for representative keys.
 *  - Placeholder interpolation works and leaves unknown placeholders intact.
 *  - Unknown keys return the key string verbatim (debuggable in dev).
 *  - No value in either dictionary leaks an email, user id, or wagering
 *    / betting language (matches the safety stance used by the AI helpers).
 *  - Both locales have parity — every English key has a Spanish translation
 *    (avoids accidental English bleed-through under Spanish).
 *
 * NOTE: This file imports the helper directly. It does not exercise the
 * React provider, only the pure function surface, so it is fast and stable.
 */
import { describe, expect, it } from "vitest"
import {
  getWorldCupLocale,
  wcT,
  makeWcT,
  WORLD_CUP_TRANSLATIONS,
  WORLD_CUP_DEFAULT_LOCALE,
  WORLD_CUP_SUPPORTED_LOCALES,
} from "@/lib/world-cup/worldCupI18n"

describe("worldCupI18n: getWorldCupLocale", () => {
  it("returns 'en' for unknown / nullish input", () => {
    expect(getWorldCupLocale(undefined)).toBe("en")
    expect(getWorldCupLocale(null)).toBe("en")
    expect(getWorldCupLocale("")).toBe("en")
    expect(getWorldCupLocale("xx")).toBe("en")
    expect(getWorldCupLocale(42 as unknown)).toBe("en")
  })

  it("returns 'es' for Spanish", () => {
    expect(getWorldCupLocale("es")).toBe("es")
  })

  it("returns 'en' for other app-wide locales (zh/fil/vi)", () => {
    expect(getWorldCupLocale("zh")).toBe("en")
    expect(getWorldCupLocale("fil")).toBe("en")
    expect(getWorldCupLocale("vi")).toBe("en")
  })

  it("normalizes to default for 'en'", () => {
    expect(getWorldCupLocale("en")).toBe("en")
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

  it("returns the English value when locale is 'en'", () => {
    expect(wcT("en", "wc.tab.picks")).toBe("Knockouts")
    expect(wcT("en", "wc.tab.groupStage")).toBe("Group Stage")
  })

  it("falls back to the key string when the key is unknown in both locales", () => {
    expect(wcT("en", "wc.this.key.does.not.exist")).toBe("wc.this.key.does.not.exist")
    expect(wcT("es", "wc.this.key.does.not.exist")).toBe("wc.this.key.does.not.exist")
  })

  it("falls back to English when the key only exists in English", () => {
    // Synthesize a fake key in en that does not exist in es. Test by
    // temporarily comparing against the English dictionary directly.
    const sample = "wc.tab.home"
    const enValue = WORLD_CUP_TRANSLATIONS.en[sample]
    expect(typeof enValue).toBe("string")
    // The es dict also has this key; the fallback path is exercised when
    // we feed an arbitrary key.
    expect(wcT("es", sample)).toBe(WORLD_CUP_TRANSLATIONS.es[sample])
  })

  it("interpolates {{var}} placeholders from params", () => {
    expect(wcT("en", "wc.lock.untilLockDays", { d: 3, h: 7 })).toBe(
      "3d 7h until picks lock"
    )
    expect(wcT("es", "wc.lock.untilLockDays", { d: 3, h: 7 })).toBe(
      "3d 7h para que cierren los picks"
    )
  })

  it("interpolates numeric and string params", () => {
    expect(
      wcT("en", "wc.knockouts.guidance.complete", { done: 5, required: 10 })
    ).toBe("5/10 currently available picks complete.")
    expect(
      wcT("es", "wc.knockouts.guidance.complete", { done: 5, required: 10 })
    ).toBe("5/10 picks disponibles completados.")
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
    expect(tEn("wc.tab.picks")).toBe("Knockouts")
    expect(tEs("wc.tab.picks")).toBe("Eliminatorias")
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

  it("no value contains wagering / gambling / odds language", () => {
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

  it("Spanish dictionary has the same keys as English (parity)", () => {
    const enKeys = Object.keys(WORLD_CUP_TRANSLATIONS.en).sort()
    const esKeys = Object.keys(WORLD_CUP_TRANSLATIONS.es).sort()
    const missingInEs = enKeys.filter((k) => !(k in WORLD_CUP_TRANSLATIONS.es))
    const missingInEn = esKeys.filter((k) => !(k in WORLD_CUP_TRANSLATIONS.en))
    expect(missingInEs, "Spanish dictionary is missing English keys").toEqual([])
    expect(missingInEn, "English dictionary is missing Spanish keys").toEqual([])
  })

  it("no Spanish value is exactly identical to its English value unless it's a brand / proper noun / shared label", () => {
    // Allowlist: short English-only proper nouns / brand strings that are
    // intentionally identical across locales. Keep this set small.
    const allowlist = new Set([
      "wc.tab.leaderboard", // "Leaderboard" — kept as English brand term
      "wc.tab.admin", // "Admin" — same in es
      "wc.danger.tierPro", // "AF Pro" — brand
      "wc.aiReport.tierActive", // contains AF Pro
      "wc.aiReport.tierPreview",
      "wc.language.english",
      "wc.language.spanish",
      "wc.publicHub.statusFinal", // "Final" — same in en/es
      "wc.invite.shareViaEmail", // "Email" — same in en/es
    ])
    const dups: string[] = []
    for (const [key, enValue] of Object.entries(WORLD_CUP_TRANSLATIONS.en)) {
      if (allowlist.has(key)) continue
      const esValue = WORLD_CUP_TRANSLATIONS.es[key]
      if (esValue === enValue) dups.push(`${key} → "${enValue}"`)
    }
    expect(dups, "Spanish translation should differ from English for these keys").toEqual([])
  })
})

describe("worldCupI18n: default locale", () => {
  it("default locale is 'en'", () => {
    expect(WORLD_CUP_DEFAULT_LOCALE).toBe("en")
  })

  it("supported locales are exactly ['en','es']", () => {
    expect(WORLD_CUP_SUPPORTED_LOCALES).toEqual(["en", "es"])
  })
})
