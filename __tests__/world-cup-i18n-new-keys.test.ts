/**
 * Verifies that every new i18n key added in the World Cup UX Truth Audit
 * (subnav labels, mobile short-labels, home tab strings, AI teaser) is
 * present and non-empty in all five supported locales.
 *
 * Guards against missing-translation regressions where a key was added to
 * the EN dict but not the others.
 */
import { describe, expect, it } from "vitest"
import { makeWcT } from "@/lib/world-cup/worldCupI18n"

const LOCALES = ["en", "es", "zh", "fil", "vi"] as const

const NEW_KEYS = [
  // Sticky subnav
  "wc.subnav.top",
  "wc.subnav.roundOf32",
  "wc.subnav.adminTest",
  // Mobile bottom nav short labels
  "wc.tab.leaderboard.short",
  "wc.tab.commissioner.short",
  "wc.tab.settings.short",
  // Home tab — main card
  "wc.home.title",
  "wc.home.copyInvite",
  "wc.home.invitePanel",
  // Home tab — stat cards
  "wc.home.stat.participants",
  "wc.home.stat.entries",
  "wc.home.stat.finalized",
  "wc.home.stat.fixtureStatus",
  "wc.home.stat.ready",
  "wc.home.stat.notReady",
  // Home tab — entries section
  "wc.home.entries.title",
  "wc.home.entries.loading",
  // Home tab — AI features teaser
  "wc.home.ai.title",
  "wc.home.ai.chimmyHint",
  "wc.home.ai.explainHint",
  "wc.home.ai.unlockHint",
] as const

describe("worldCupI18n — new keys present and non-empty in all locales", () => {
  for (const locale of LOCALES) {
    const t = makeWcT(locale)
    describe(`locale "${locale}"`, () => {
      for (const key of NEW_KEYS) {
        it(`"${key}" resolves to a non-empty translated string`, () => {
          const result = t(key)
          expect(typeof result).toBe("string")
          expect(result.trim().length).toBeGreaterThan(0)
        })
      }
    })
  }
})
