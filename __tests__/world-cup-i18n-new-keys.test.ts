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
  // v2 command center — hero
  "wc.publicHub.commandEyebrow",
  "wc.publicHub.commandTitle",
  "wc.publicHub.commandSubtitle",
  "wc.publicHub.trustNote",
  // v2 command center — stats strip
  "wc.publicHub.stat.teams",
  "wc.publicHub.stat.groups",
  "wc.publicHub.stat.matches",
  "wc.publicHub.stat.format",
  // v2 command center — action cards
  "wc.publicHub.actionsTitle",
  "wc.publicHub.action.create.title",
  "wc.publicHub.action.create.desc",
  "wc.publicHub.action.join.title",
  "wc.publicHub.action.join.desc",
  "wc.publicHub.action.discover.title",
  "wc.publicHub.action.discover.desc",
  // v2 command center — how it works
  "wc.publicHub.how.title",
  "wc.publicHub.how.step1Title",
  "wc.publicHub.how.step1Body",
  "wc.publicHub.how.step2Title",
  "wc.publicHub.how.step2Body",
  "wc.publicHub.how.step3Title",
  "wc.publicHub.how.step3Body",
  "wc.publicHub.how.step4Title",
  "wc.publicHub.how.step4Body",
  // v2 command center — AI advantage
  "wc.publicHub.ai.title",
  "wc.publicHub.ai.subtitle",
  "wc.publicHub.ai.explain.title",
  "wc.publicHub.ai.explain.desc",
  "wc.publicHub.ai.danger.title",
  "wc.publicHub.ai.danger.desc",
  "wc.publicHub.ai.chat.title",
  "wc.publicHub.ai.chat.desc",
  "wc.publicHub.ai.commissioner.title",
  "wc.publicHub.ai.commissioner.desc",
  "wc.publicHub.ai.gating",
  // v2 command center — social / invite
  "wc.publicHub.social.title",
  "wc.publicHub.social.desc",
  "wc.publicHub.social.cta",
  // v2 command center — trust banner
  "wc.publicHub.trust.note",
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
