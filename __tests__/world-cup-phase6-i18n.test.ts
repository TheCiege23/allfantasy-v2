/**
 * Phase 6: Remaining World Cup Surfaces + Social Caption Templates
 *
 * Coverage:
 *  - GuidedMatchupPicker / ScoreSummary / RoundBreakdown / LeaderboardInsights
 *    components are wired to `wcT()` (grep-style source checks)
 *  - Settings + Commissioner Brain admin panels translate their chrome
 *  - `buildWorldCupSocialCaptions` supports all 5 locales and 3 tones
 *  - Required hashtag block stays untouched across every locale + tone
 *  - Wagering/betting/sportsbook/DFS/odds language is sanitized away
 *  - Trash-talk guardrails: no hate / slur / threat / personal attack tokens
 *  - Team names pass through untranslated
 *  - Unknown locale + unknown tone fall back to English + friendly
 *  - No new app routes / pages
 *  - No runtime Google Translate / dev script import in app surfaces
 *
 * Behavior tests grep source text rather than rendering the React tree —
 * matches the pattern used in earlier Phase 5/6 wiring tests for stability.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  WORLD_CUP_SUPPORTED_LOCALES,
  WORLD_CUP_TRANSLATIONS,
  type WorldCupLocale,
} from "@/lib/world-cup/worldCupI18n"
import {
  buildWorldCupSocialCaptions,
  WORLD_CUP_SOCIAL_HASHTAGS,
  type WorldCupSocialCaptions,
} from "@/lib/world-cup/worldCupShareCopy"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8")
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const FORBIDDEN_TOKENS_FOR_SAFETY: RegExp[] = [
  // Wagering / betting blocklist (must be sanitized).
  /\bbetting\b/i,
  /\bwager(?:ing|s|ed)?\b/i,
  /\bsportsbook\b/i,
  /\bodds\b/i,
  /\bdfs\b/i,
]

const TRASH_TALK_DISALLOWED: RegExp[] = [
  // No hate / slurs / personal attacks / threats. These are extremely
  // common attacker tokens; the deterministic templates must never emit them.
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bdumb\b/i,
  /\bloser\b/i,
  /\btrash\b/i, // (template uses "trash_talk" tone name, not the word in copy)
  /\bhate\b/i,
  /\bkill\b/i,
  /\bdie\b/i,
  /\bdeath\b/i,
  /\bgarbage\b/i,
  /\bworthless\b/i,
]

const ALL_TONES = ["friendly", "hype", "trash_talk"] as const
type Tone = (typeof ALL_TONES)[number]
const PLATFORMS = [
  "twitter",
  "instagram",
  "discord",
  "facebook",
] as const

function eachCaptionString(c: WorldCupSocialCaptions): string[] {
  return [c.twitter, c.instagram, c.discord, c.facebook, c.reddit.title, c.reddit.body]
}

// ─── 1. New i18n keys exist in all 5 locales ──────────────────────────────

describe("Phase 6: new dictionary keys are present in every locale", () => {
  const NEW_KEYS = [
    // Guided picker
    "wc.guided.dialogLabel",
    "wc.guided.closeLabel",
    "wc.guided.timeTbd",
    "wc.guided.awaitingResult",
    "wc.guided.matchFinal",
    "wc.guided.matchPostponed",
    "wc.guided.pickAriaLabel",
    "wc.guided.progressRound",
    "wc.guided.progressOverall",
    "wc.guided.headerLocked",
    "wc.guided.headerFixturesNotReady",
    "wc.guided.headerStart",
    "wc.guided.headerComplete",
    "wc.guided.headerGuided",
    "wc.guided.lockedHelper",
    "wc.guided.emptyTeamsUpstream",
    "wc.guided.emptyFixturesUnresolved",
    "wc.guided.close",
    "wc.guided.back",
    "wc.guided.skip",
    "wc.guided.matchNumber",
    "wc.guided.saving",
    "wc.guided.saved",
    "wc.guided.nextMatchup",
    "wc.guided.tapToSelect",
    "wc.guided.tapToChange",
    "wc.guided.matchFinalNote",
    "wc.guided.pickEarlierRoundsFirst",
    "wc.guided.matchEnded",
    "wc.guided.matchLocked",
    "wc.guided.confidenceTitle",
    "wc.guided.confidenceHelper",
    "wc.guided.confidenceOptionOne",
    "wc.guided.confidenceOptionOther",
    "wc.guided.bracketCompleteTitle",
    "wc.guided.bracketCompleteBody",
    "wc.guided.reviewBracket",
    "wc.guided.done",
    "wc.guided.errorNotReady",
    "wc.guided.errorSaveFailed",
    "wc.guided.vs",
    "wc.guided.tbd",
    // Score summary
    "wc.summary.title",
    "wc.summary.rankPlaceholder",
    "wc.summary.bracketComplete",
    "wc.summary.bracketIncomplete",
    "wc.summary.fixturesNotReady",
    "wc.summary.scoresNotSynced",
    "wc.summary.locked",
    "wc.summary.totalPts",
    "wc.summary.possibleLeft",
    "wc.summary.correct",
    "wc.summary.wrong",
    "wc.summary.championPick",
    "wc.summary.championAlive",
    "wc.summary.championBusted",
    "wc.summary.noChampionYet",
    "wc.summary.maxCeiling",
    "wc.summary.maxCeilingBody",
    // Round breakdown
    "wc.roundBreakdown.title",
    "wc.roundBreakdown.ptsAbbrev",
    "wc.roundBreakdown.perWin",
    "wc.roundBreakdown.championBonus",
    // Leaderboard insights
    "wc.insights.title",
    "wc.insights.empty",
    "wc.insights.currentLeader",
    "wc.insights.largestGap",
    "wc.insights.entries",
    "wc.insights.championsAlive",
    "wc.insights.mostCorrect",
    "wc.insights.closestRace",
    "wc.insights.notClose",
    "wc.insights.gapPts",
    "wc.insights.mostCorrectValue",
    "wc.insights.aiSummaryTitle",
    "wc.insights.aiBadgeUnlocked",
    "wc.insights.aiBadgeLocked",
    "wc.insights.aiNotAvailable",
    "wc.insights.aiSummaryCountOne",
    "wc.insights.aiSummaryCountOther",
    "wc.insights.aiSummaryLabel",
    "wc.insights.aiCommonChampionLabel",
    "wc.insights.aiRaceLabel",
    "wc.insights.aiRaceClose",
    "wc.insights.aiRaceNotClose",
    "wc.insights.aiWinReadLabel",
    "wc.insights.aiWinReadBody",
    "wc.insights.aiPrivacyNote",
    "wc.insights.aiUpgradeNote",
    // Settings + brain
    "wc.settings.title",
    "wc.settings.subtitle",
    "wc.settings.loading",
    "wc.settings.sectionIdentity",
    "wc.settings.save",
    "wc.settings.saving",
    "wc.settings.toastNoChanges",
    "wc.settings.toastSaved",
    "wc.settings.toastError",
    "wc.brain.title",
    "wc.brain.subtitle",
    "wc.brain.loading",
    "wc.brain.loadError",
  ] as const

  for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
    it(`locale "${locale}" defines every Phase 6 key`, () => {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      for (const key of NEW_KEYS) {
        expect(dict[key], `${locale} missing ${key}`).toBeTypeOf("string")
        expect(dict[key], `${locale} empty ${key}`).not.toBe("")
      }
    })
  }
})

// ─── 2. Component source files call wcT/makeWcT for new keys ──────────────

describe("Phase 6: GuidedMatchupPicker wired to wcT", () => {
  const src = read("components/brackets/world-cup/WorldCupGuidedMatchupPicker.tsx")

  it("imports makeWcT and useOptionalLanguage", () => {
    expect(src).toContain('makeWcT')
    expect(src).toContain('useOptionalLanguage')
  })

  it("translates header and dialog chrome", () => {
    expect(src).toContain('"wc.guided.dialogLabel"')
    expect(src).toContain('"wc.guided.closeLabel"')
    expect(src).toContain('"wc.guided.headerLocked"')
    expect(src).toContain('"wc.guided.headerComplete"')
    expect(src).toContain('"wc.guided.headerGuided"')
  })

  it("translates pick hints and confidence selector", () => {
    expect(src).toContain('"wc.guided.tapToSelect"')
    expect(src).toContain('"wc.guided.tapToChange"')
    expect(src).toContain('"wc.guided.confidenceTitle"')
    expect(src).toContain('"wc.guided.confidenceHelper"')
    expect(src).toContain('"wc.guided.confidenceOptionOne"')
    expect(src).toContain('"wc.guided.confidenceOptionOther"')
  })

  it("translates Bracket Complete view", () => {
    expect(src).toContain('"wc.guided.bracketCompleteTitle"')
    expect(src).toContain('"wc.guided.bracketCompleteBody"')
    expect(src).toContain('"wc.guided.reviewBracket"')
    expect(src).toContain('"wc.guided.done"')
  })

  it("does NOT translate raw team names — passes them through", () => {
    // The pick aria-label interpolates `{{teamName}}`, never wraps it
    // in a translator call. Team name comes straight from data.
    expect(src).toContain('teamName={eff.home.teamName || "TBD"}')
    expect(src).toContain('teamName={eff.away.teamName || "TBD"}')
    expect(src).toMatch(/t\("wc\.guided\.pickAriaLabel", \{ teamName \}\)/)
  })

  it("does not introduce browser-only reads at render scope", () => {
    expect(src).not.toMatch(/^\s*localStorage\./m)
    expect(src).not.toMatch(/^\s*navigator\./m)
  })
})

describe("Phase 6: ScoreSummary wired to wcT", () => {
  const src = read("components/brackets/world-cup/WorldCupScoreSummary.tsx")

  it("imports translator", () => {
    expect(src).toContain('makeWcT')
    expect(src).toContain('useOptionalLanguage')
  })

  it("translates all summary card labels", () => {
    expect(src).toContain('"wc.summary.title"')
    expect(src).toContain('"wc.summary.bracketComplete"')
    expect(src).toContain('"wc.summary.bracketIncomplete"')
    expect(src).toContain('"wc.summary.totalPts"')
    expect(src).toContain('"wc.summary.possibleLeft"')
    expect(src).toContain('"wc.summary.correct"')
    expect(src).toContain('"wc.summary.wrong"')
    expect(src).toContain('"wc.summary.championPick"')
    expect(src).toContain('"wc.summary.championAlive"')
    expect(src).toContain('"wc.summary.championBusted"')
    expect(src).toContain('"wc.summary.noChampionYet"')
    expect(src).toContain('"wc.summary.maxCeiling"')
  })

  it("translates banner copy", () => {
    expect(src).toContain('"wc.summary.fixturesNotReady"')
    expect(src).toContain('"wc.summary.scoresNotSynced"')
    expect(src).toContain('"wc.summary.locked"')
  })
})

describe("Phase 6: RoundBreakdown wired to wcT", () => {
  const src = read("components/brackets/world-cup/WorldCupRoundBreakdown.tsx")

  it("imports translator", () => {
    expect(src).toContain('makeWcT')
    expect(src).toContain('useOptionalLanguage')
  })

  it("translates round scoring chrome", () => {
    expect(src).toContain('"wc.roundBreakdown.title"')
    expect(src).toContain('"wc.roundBreakdown.ptsAbbrev"')
    expect(src).toContain('"wc.roundBreakdown.perWin"')
    expect(src).toContain('"wc.roundBreakdown.championBonus"')
  })
})

describe("Phase 6: LeaderboardInsights wired to wcT", () => {
  const src = read("components/brackets/world-cup/WorldCupLeaderboardInsights.tsx")

  it("declares use client + imports translator", () => {
    expect(src.startsWith('"use client"')).toBe(true)
    expect(src).toContain('makeWcT')
    expect(src).toContain('useOptionalLanguage')
  })

  it("translates insights chrome + cards", () => {
    expect(src).toContain('"wc.insights.title"')
    expect(src).toContain('"wc.insights.empty"')
    expect(src).toContain('"wc.insights.currentLeader"')
    expect(src).toContain('"wc.insights.largestGap"')
    expect(src).toContain('"wc.insights.entries"')
    expect(src).toContain('"wc.insights.championsAlive"')
    expect(src).toContain('"wc.insights.mostCorrect"')
    expect(src).toContain('"wc.insights.closestRace"')
    expect(src).toContain('"wc.insights.notClose"')
    expect(src).toContain('"wc.insights.aiSummaryTitle"')
    expect(src).toContain('"wc.insights.aiBadgeUnlocked"')
    expect(src).toContain('"wc.insights.aiBadgeLocked"')
    expect(src).toContain('"wc.insights.aiPrivacyNote"')
    expect(src).toContain('"wc.insights.aiUpgradeNote"')
  })

  it("does NOT translate user-supplied entry/champion names", () => {
    // Entry names interpolate as `${leader.entryName} vs ${runnerUp.entryName}`
    // and are passed raw to the card. We assert the literal closestRace
    // construction stays raw-string concat (no translator wrapping the names).
    expect(src).toContain('`${leader.entryName} vs ${runnerUp.entryName}`')
  })
})

describe("Phase 6: Settings + Commissioner Brain chrome wired to wcT", () => {
  const settingsSrc = read("components/brackets/world-cup/WorldCupBracketSettingsPanel.tsx")
  const brainSrc = read("components/brackets/world-cup/WorldCupCommissionerBrainPanel.tsx")

  it("settings panel translates title + subtitle + toasts + save button", () => {
    expect(settingsSrc).toContain('makeWcT')
    expect(settingsSrc).toContain('"wc.settings.title"')
    expect(settingsSrc).toContain('"wc.settings.subtitle"')
    expect(settingsSrc).toContain('"wc.settings.loading"')
    expect(settingsSrc).toContain('"wc.settings.save"')
    expect(settingsSrc).toContain('"wc.settings.saving"')
    expect(settingsSrc).toContain('"wc.settings.toastNoChanges"')
    expect(settingsSrc).toContain('"wc.settings.toastSaved"')
    expect(settingsSrc).toContain('"wc.settings.toastError"')
    expect(settingsSrc).toContain('"wc.settings.sectionIdentity"')
  })

  it("commissioner brain panel translates loading + load error chrome", () => {
    expect(brainSrc).toContain('makeWcT')
    expect(brainSrc).toContain('"wc.brain.loading"')
    expect(brainSrc).toContain('"wc.brain.loadError"')
  })
})

// ─── 3. Social caption templates: 5 locales × 3 tones ─────────────────────

describe("buildWorldCupSocialCaptions: full locale × tone matrix", () => {
  const baseInput = {
    poolName: "Bracket Bash",
    entryName: "Pickin' Pickers",
    championName: "Brazil",
    gradeLabel: "B+",
    isComplete: true,
    poolUrl: "https://allfantasy.ai/brackets/world-cup/abc",
  }

  for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
    for (const tone of ALL_TONES) {
      it(`${locale} × ${tone} returns all 6 captions (4 platforms + reddit title+body)`, () => {
        const captions = buildWorldCupSocialCaptions({ ...baseInput, locale, tone })
        expect(typeof captions.twitter).toBe("string")
        expect(typeof captions.instagram).toBe("string")
        expect(typeof captions.discord).toBe("string")
        expect(typeof captions.facebook).toBe("string")
        expect(typeof captions.reddit.title).toBe("string")
        expect(typeof captions.reddit.body).toBe("string")
        for (const s of eachCaptionString(captions)) {
          expect(s.length).toBeGreaterThan(0)
        }
      })

      it(`${locale} × ${tone} includes the required hashtag block on every platform (not reddit title)`, () => {
        const captions = buildWorldCupSocialCaptions({ ...baseInput, locale, tone })
        expect(captions.twitter).toContain(WORLD_CUP_SOCIAL_HASHTAGS)
        expect(captions.instagram).toContain(WORLD_CUP_SOCIAL_HASHTAGS)
        expect(captions.discord).toContain(WORLD_CUP_SOCIAL_HASHTAGS)
        expect(captions.facebook).toContain(WORLD_CUP_SOCIAL_HASHTAGS)
        expect(captions.reddit.body).toContain(WORLD_CUP_SOCIAL_HASHTAGS)
        // Reddit titles deliberately omit hashtags (subreddit convention).
        expect(captions.reddit.title).not.toContain(WORLD_CUP_SOCIAL_HASHTAGS)
      })

      it(`${locale} × ${tone} hashtag block stays verbatim (locale-invariant)`, () => {
        // Even on non-Latin locales (zh/vi), the hashtag block must not be
        // translated or have its tags reordered.
        const captions = buildWorldCupSocialCaptions({ ...baseInput, locale, tone })
        expect(captions.twitter.endsWith(WORLD_CUP_SOCIAL_HASHTAGS)).toBe(true)
      })

      it(`${locale} × ${tone} preserves team / champion names untranslated`, () => {
        const captions = buildWorldCupSocialCaptions({ ...baseInput, locale, tone })
        // Champion name MUST appear raw in the longer-form captions
        // (instagram + reddit body) — those always include the champion line.
        // Some terse formats (reddit title, some trash_talk twitter variants)
        // intentionally omit the champion — that's fine.
        expect(
          captions.instagram,
          `${locale}/${tone} instagram missing raw champion name`
        ).toContain("Brazil")
        expect(
          captions.reddit.body,
          `${locale}/${tone} reddit body missing raw champion name`
        ).toContain("Brazil")
        // Pool name passes through raw on every caption (used as anchor).
        for (const s of eachCaptionString(captions)) {
          expect(s, `${locale}/${tone} caption missing raw pool name`).toContain(
            "Bracket Bash"
          )
        }
      })

      it(`${locale} × ${tone} does NOT include wagering/betting/sportsbook/odds/DFS language`, () => {
        const captions = buildWorldCupSocialCaptions({ ...baseInput, locale, tone })
        for (const s of eachCaptionString(captions)) {
          for (const pattern of FORBIDDEN_TOKENS_FOR_SAFETY) {
            expect(s, `${locale}/${tone} caption contains ${pattern}`).not.toMatch(pattern)
          }
        }
      })

      if (tone === "trash_talk") {
        it(`${locale} × ${tone} trash-talk respects guardrails (no hate / slur / threat tokens)`, () => {
          const captions = buildWorldCupSocialCaptions({ ...baseInput, locale, tone })
          for (const s of eachCaptionString(captions)) {
            for (const pattern of TRASH_TALK_DISALLOWED) {
              expect(s, `${locale} trash-talk contains banned token ${pattern}`).not.toMatch(pattern)
            }
          }
        })
      }
    }
  }
})

describe("buildWorldCupSocialCaptions: defaults + fallbacks", () => {
  it("defaults to friendly tone when tone is omitted", () => {
    const a = buildWorldCupSocialCaptions({
      poolName: "Friendly Pool",
      championName: "France",
      gradeLabel: "A",
      isComplete: true,
      poolUrl: "https://example.test",
    })
    const b = buildWorldCupSocialCaptions({
      poolName: "Friendly Pool",
      championName: "France",
      gradeLabel: "A",
      isComplete: true,
      poolUrl: "https://example.test",
      tone: "friendly",
    })
    expect(a.twitter).toBe(b.twitter)
    expect(a.instagram).toBe(b.instagram)
    expect(a.discord).toBe(b.discord)
    expect(a.facebook).toBe(b.facebook)
    expect(a.reddit.title).toBe(b.reddit.title)
    expect(a.reddit.body).toBe(b.reddit.body)
  })

  it("unknown locale falls back to English templates", () => {
    const englishOut = buildWorldCupSocialCaptions({
      poolName: "Pool X",
      championName: "Argentina",
      gradeLabel: "A-",
      isComplete: true,
      poolUrl: "https://example.test",
      locale: "en",
    })
    const unknownOut = buildWorldCupSocialCaptions({
      poolName: "Pool X",
      championName: "Argentina",
      gradeLabel: "A-",
      isComplete: true,
      poolUrl: "https://example.test",
      // @ts-expect-error — exercising the runtime fallback path
      locale: "xx-INVALID",
    })
    expect(unknownOut.twitter).toBe(englishOut.twitter)
    expect(unknownOut.facebook).toBe(englishOut.facebook)
  })

  it("unknown tone falls back to friendly tone", () => {
    const friendlyOut = buildWorldCupSocialCaptions({
      poolName: "Pool Y",
      championName: "Spain",
      gradeLabel: "B",
      isComplete: true,
      poolUrl: "https://example.test",
      locale: "es",
      tone: "friendly",
    })
    const unknownTone = buildWorldCupSocialCaptions({
      poolName: "Pool Y",
      championName: "Spain",
      gradeLabel: "B",
      isComplete: true,
      poolUrl: "https://example.test",
      locale: "es",
      // @ts-expect-error — exercising the runtime fallback path
      tone: "savage",
    })
    expect(unknownTone.twitter).toBe(friendlyOut.twitter)
  })

  it("Twitter caption stays under platform length cap (~280 chars)", () => {
    // Most punishing input: long pool name + long champion + grade + URL.
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      for (const tone of ALL_TONES) {
        const out = buildWorldCupSocialCaptions({
          poolName: "The Extremely Long Pool Name That Tries To Push Limits",
          championName: "Bosnia and Herzegovina",
          gradeLabel: "A+",
          isComplete: true,
          poolUrl: "https://allfantasy.ai/brackets/world-cup/aaaaaaaaaaaaaaaa",
          locale,
          tone,
        })
        expect(
          out.twitter.length,
          `${locale}/${tone} twitter length must be ≤ 280`
        ).toBeLessThanOrEqual(280)
      }
    }
  })

  it("scrubs wagering-style inputs that sneak into pool / entry / champion names", () => {
    const out = buildWorldCupSocialCaptions({
      poolName: "DFS Sportsbook Pool",
      championName: "Wagers United",
      gradeLabel: "B",
      isComplete: true,
      poolUrl: "https://example.test/pool",
    })
    for (const s of eachCaptionString(out)) {
      for (const pattern of FORBIDDEN_TOKENS_FOR_SAFETY) {
        expect(s, `caption contains ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})

describe("buildWorldCupSocialCaptions: privacy", () => {
  it("never echoes user email / id / phone / address tokens (none injected here, but assert shape)", () => {
    const out = buildWorldCupSocialCaptions({
      poolName: "Privacy Pool",
      championName: "England",
      gradeLabel: "B",
      isComplete: true,
      poolUrl: "https://example.test",
      locale: "en",
    })
    for (const s of eachCaptionString(out)) {
      expect(s).not.toMatch(/@/) // no email-style addresses
      expect(s).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/) // no SSN-style
    }
  })
})

// ─── 4. Route / runtime safety ─────────────────────────────────────────────

describe("Phase 6: route + runtime safety", () => {
  it("no new app/route.ts / app/page.tsx introduced by this phase (smoke)", () => {
    // The Phase 5 readability test already audits the route count budget.
    // We just smoke that the share-copy + translator files don't import the
    // dev translation script into runtime.
    const sharedCopy = read("lib/world-cup/worldCupShareCopy.ts")
    const i18n = read("lib/world-cup/worldCupI18n.ts")
    for (const src of [sharedCopy, i18n]) {
      expect(src).not.toContain("scripts/translate-brackets-i18n")
      expect(src).not.toContain("googletranslate")
      expect(src).not.toContain("google-translate")
    }
  })

  it("no Phase 6 component touched calls Google Translate / dev script", () => {
    const files = [
      "components/brackets/world-cup/WorldCupGuidedMatchupPicker.tsx",
      "components/brackets/world-cup/WorldCupScoreSummary.tsx",
      "components/brackets/world-cup/WorldCupRoundBreakdown.tsx",
      "components/brackets/world-cup/WorldCupLeaderboardInsights.tsx",
      "components/brackets/world-cup/WorldCupBracketSettingsPanel.tsx",
      "components/brackets/world-cup/WorldCupCommissionerBrainPanel.tsx",
    ]
    for (const rel of files) {
      const src = read(rel)
      expect(src, `${rel} must not import dev translate script`).not.toContain(
        "scripts/translate-brackets-i18n"
      )
      expect(src, `${rel} must not call Google Translate`).not.toMatch(/google-?translate/i)
    }
  })

  it("Phase 6 components keep team-name data raw", () => {
    // Smoke: the Guided picker passes `teamName` straight to TeamCard, never
    // wraps it in a translator.
    const src = read(
      "components/brackets/world-cup/WorldCupGuidedMatchupPicker.tsx"
    )
    expect(src).not.toMatch(/t\(\s*["'][^"']+["']\s*,\s*\{[^}]*teamName:\s*t\(/)
  })

  it("WORLD_CUP_SOCIAL_HASHTAGS exposes the locked block verbatim", () => {
    expect(WORLD_CUP_SOCIAL_HASHTAGS).toBe(
      "#fantasyfootball #NFL #football #fantasyfootballadvice #sports #nflnews #fantasyfootballdraft"
    )
  })
})

// ─── 5. Caption locales actually differ from English ──────────────────────

describe("buildWorldCupSocialCaptions: localized output diverges from English", () => {
  const baseInput = {
    poolName: "Compare Pool",
    championName: "Portugal",
    gradeLabel: "B",
    isComplete: true,
    poolUrl: "https://example.test/c",
  }

  const englishCaptions = buildWorldCupSocialCaptions({ ...baseInput, locale: "en" })

  // Sanity: non-English locales must produce different prose (not just a
  // hashtag block append).
  const nonEnglish: WorldCupLocale[] = ["es", "zh", "fil", "vi"]
  for (const locale of nonEnglish) {
    it(`${locale} twitter caption is not byte-identical to English`, () => {
      const out = buildWorldCupSocialCaptions({ ...baseInput, locale })
      expect(out.twitter).not.toBe(englishCaptions.twitter)
    })
    it(`${locale} facebook caption is not byte-identical to English`, () => {
      const out = buildWorldCupSocialCaptions({ ...baseInput, locale })
      expect(out.facebook).not.toBe(englishCaptions.facebook)
    })
  }
})
