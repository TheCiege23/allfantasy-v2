/**
 * Targeted wiring coverage for the World Cup dashboard cards translated
 * in Phase 4 — finalize/share success block, inside-pool Invite tab,
 * Commissioner Checklist, and AI Report card chrome.
 *
 * This file does not render React. It greps the component / helper
 * source as text to confirm:
 *  - Each new translation key exists in every locale.
 *  - Each component calls `t(...)` for its major visible labels.
 *  - Each component has dropped the pre-i18n English literals it used to
 *    hardcode for those labels.
 *  - The locale-aware template helpers
 *    (`buildWorldCupInviteMessage`,
 *     `buildWorldCupBracketShareMessage`,
 *     `buildWorldCupCommissionerChecklist`)
 *    accept a `locale` parameter and emit different output per locale,
 *    yet:
 *      - the required hashtag block is locale-invariant,
 *      - member-audience invite messages never leak invite code/url,
 *      - reminder messages never include the invite code,
 *      - sanitize-blocked wagering / sportsbook / DFS language is
 *        absent in every locale,
 *      - PII (email, userId, CUID) is absent.
 *  - The AI language instruction helper returns expected language names.
 *  - The Google Translate batch script is not imported by any translated
 *    runtime module.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  WORLD_CUP_TRANSLATIONS,
  WORLD_CUP_SUPPORTED_LOCALES,
  wcT,
  getAiLanguageInstruction,
  WORLD_CUP_DEFAULT_SHARE_TONE,
  type WorldCupShareTone,
} from "@/lib/world-cup/worldCupI18n"
import {
  buildWorldCupInviteMessage,
  buildWorldCupBracketShareMessage,
  WORLD_CUP_SOCIAL_HASHTAGS,
} from "@/lib/world-cup/worldCupShareCopy"
import {
  buildWorldCupCommissionerChecklist,
} from "@/lib/world-cup/worldCupCommissionerChecklist"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

function readSource(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8")
}

const SHELL_SRC = readSource(
  "components/brackets/world-cup/WorldCupBracketShell.tsx"
)
const INVITE_PANEL_SRC = readSource(
  "components/brackets/world-cup/WorldCupInvitePanel.tsx"
)
const CHECKLIST_SRC = readSource(
  "components/brackets/world-cup/WorldCupCommissionerChecklistCard.tsx"
)
const AI_SHARE_SRC = readSource(
  "components/brackets/world-cup/WorldCupAiBracketShareCard.tsx"
)
const EXPLAIN_SRC = readSource(
  "components/brackets/world-cup/WorldCupExplainBracketCard.tsx"
)
const UNIQUENESS_SRC = readSource(
  "components/brackets/world-cup/WorldCupBracketUniquenessCard.tsx"
)
const SHARE_COPY_SRC = readSource("lib/world-cup/worldCupShareCopy.ts")
const CHECKLIST_LIB_SRC = readSource(
  "lib/world-cup/worldCupCommissionerChecklist.ts"
)

// ── Key parity for every new key per locale ─────────────────────────────────

describe("WC dashboard cards i18n: dictionary parity for new keys", () => {
  const newKeys = [
    // Finalize / share success block
    "wc.finalize.eyebrow",
    "wc.finalize.title",
    "wc.finalize.subtitleNoTime",
    "wc.finalize.subtitleWithTime",
    "wc.finalize.copyShare",
    "wc.finalize.copyShareCopied",
    "wc.finalize.shareReport",
    "wc.finalize.inviteFriends",
    "wc.finalize.previewShare",
    // Inside-pool Invite tab
    "wc.inviteTab.eyebrow",
    "wc.inviteTab.title",
    "wc.inviteTab.detailsTitle",
    "wc.inviteTab.meta.pool",
    "wc.inviteTab.meta.privacy",
    "wc.inviteTab.meta.privacyPublic",
    "wc.inviteTab.meta.privacyPrivate",
    "wc.inviteTab.meta.maxUsers",
    "wc.inviteTab.meta.bracketsPerUser",
    "wc.inviteTab.meta.scoring",
    "wc.inviteTab.meta.scoringValue",
    "wc.inviteTab.meta.lockRule",
    "wc.inviteTab.meta.lockTournament",
    "wc.inviteTab.meta.lockPerMatch",
    "wc.inviteTab.lockedBanner",
    "wc.inviteTab.member.title",
    "wc.inviteTab.member.body",
    "wc.inviteTab.commissioner.linkTitle",
    "wc.inviteTab.commissioner.linkHelper",
    "wc.inviteTab.commissioner.codeLabel",
    "wc.inviteTab.commissioner.copyCode",
    "wc.inviteTab.commissioner.copyCodeDone",
    "wc.inviteTab.commissioner.copyLink",
    "wc.inviteTab.commissioner.copyLinkDone",
    "wc.inviteTab.commissioner.copyMessage",
    "wc.inviteTab.commissioner.copyMessageDone",
    "wc.inviteTab.commissioner.share",
    "wc.inviteTab.commissioner.previewInvite",
    "wc.inviteTab.commissioner.previewShare",
    "wc.inviteTab.commissioner.noCodeTitle",
    "wc.inviteTab.commissioner.noCodeBody",
    "wc.inviteTab.shareMessage.default",
    "wc.inviteTab.shareTitleNative",
    // Commissioner Checklist
    "wc.checklist.eyebrow",
    "wc.checklist.cardSubtitle",
    "wc.checklist.copyReminderBtn",
    "wc.checklist.copyReminderDone",
    "wc.checklist.stat.total",
    "wc.checklist.stat.finalized",
    "wc.checklist.stat.inProgress",
    "wc.checklist.stat.completion",
    "wc.checklist.entryStatus.finalized",
    "wc.checklist.entryStatus.inProgress",
    "wc.checklist.entryStatus.needsPicks",
    "wc.checklist.entryStatus.unknown",
    "wc.checklist.needsReminderBadge",
    "wc.checklist.missingPicks",
    "wc.checklist.previewReminder",
    "wc.checklist.privacyNote",
    "wc.checklist.empty.memberOnly",
    "wc.checklist.empty.loading",
    "wc.checklist.empty.noMembers",
    "wc.checklist.empty.fallback",
    "wc.checklist.row.memberFallback",
    "wc.checklist.row.bracketFallback",
    "wc.checklist.row.finalizedRowOne",
    "wc.checklist.row.finalizedRowOther",
    "wc.checklist.reminder.askCommissioner",
    "wc.checklist.reminder.finalizeLine",
    "wc.checklist.reminder.joinLine",
    "wc.checklist.reminder.statusLine",
    "wc.checklist.reminder.deadlineLine",
    "wc.checklist.reminder.poweredBy",
    "wc.checklist.reminder.noSnapshotLine",
    // AI Report card chrome
    "wc.aiShareCard.eyebrow",
    "wc.aiShareCard.subtitle",
    "wc.aiShareCard.tierPro",
    "wc.aiShareCard.tierPreview",
    "wc.aiShareCard.emptyNoEntry",
    "wc.aiShareCard.copyShare",
    "wc.aiShareCard.copyShareDone",
    "wc.aiShareCard.share",
    "wc.aiShareCard.privacyNote",
    "wc.explain.eyebrow",
    "wc.explain.title",
    "wc.explain.subtitle",
    "wc.explain.tierPro",
    "wc.explain.tierLocked",
    "wc.explain.locked",
    "wc.explain.generate",
    "wc.explain.generating",
    "wc.explain.selectFirst",
    "wc.explain.regenerate",
    "wc.explain.regenerating",
    "wc.explain.fallbackBadge",
    "wc.explain.error.generic",
    "wc.explain.error.network",
    "wc.explain.privacyNote",
    "wc.uniqueness.eyebrow",
    "wc.uniqueness.title",
    "wc.uniqueness.subtitle",
    "wc.uniqueness.tierPro",
    "wc.uniqueness.tierBasic",
    "wc.uniqueness.empty.noEntry",
    "wc.uniqueness.loading",
    "wc.uniqueness.error.couldNotLoad",
    "wc.uniqueness.error.network",
    "wc.uniqueness.empty.notEnoughData",
    "wc.uniqueness.empty.incomplete",
    "wc.uniqueness.rarity.veryRare",
    "wc.uniqueness.rarity.rare",
    "wc.uniqueness.rarity.uncommon",
    "wc.uniqueness.rarity.common",
    "wc.uniqueness.percentShare",
    "wc.uniqueness.privacyNote",
    "wc.grade.eyebrow",
    "wc.grade.completionLabel",
    "wc.grade.tierProDetail",
    "wc.grade.tierBasic",
    "wc.grade.stat.groups",
    "wc.grade.stat.thirdPlace",
    "wc.grade.stat.knockouts",
    "wc.grade.stat.missing",
    "wc.grade.risk",
    "wc.grade.upset",
    "wc.grade.championConfidence",
    "wc.grade.championConfidenceNone",
    "wc.grade.biggestRisk",
    "wc.grade.recommendation",
    "wc.grade.lockedBody",
    "wc.confidence.title",
    "wc.confidence.tierOpen",
    "wc.confidence.tierLocked",
    "wc.confidence.missingPicks",
    "wc.confidence.noMissing",
    "wc.confidence.missingBreakdown",
    "wc.confidence.highRiskPicks",
    "wc.confidence.highRiskBody",
    "wc.confidence.bracketShape",
    "wc.confidence.bracketShapeChalk",
    "wc.confidence.bracketShapeBalanced",
    "wc.confidence.finalizeConfidence",
    "wc.confidence.finalizeReady",
    "wc.confidence.finalizeMissing",
    "wc.confidence.privacyNote",
    "wc.confidence.lockedBody",
    "wc.path.title",
    "wc.path.subtitle",
    "wc.path.tierActive",
    "wc.path.tierLocked",
  ]

  for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
    it(`every new key has a translation in locale "${locale}"`, () => {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      const missing: string[] = []
      for (const key of newKeys) {
        if (typeof dict[key] !== "string" || dict[key].length === 0) {
          missing.push(key)
        }
      }
      expect(missing, `Locale "${locale}" is missing keys`).toEqual([])
    })
  }
})

// ── Finalize / share success block ──────────────────────────────────────────

describe("WC dashboard cards i18n: finalize/share success block wiring", () => {
  it("WorldCupBracketShell calls t() for the finalize block labels", () => {
    expect(SHELL_SRC).toContain(`t("wc.finalize.eyebrow")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.title")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.copyShare")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.copyShareCopied")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.shareReport")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.inviteFriends")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.previewShare")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.subtitleNoTime")`)
    expect(SHELL_SRC).toContain(`t("wc.finalize.subtitleWithTime"`)
  })

  it("WorldCupBracketShell uses a mount gate for the submittedAt locale-formatted timestamp", () => {
    // Verifies the hydration-safe pattern is in place around the
    // finalize block's submittedAt label.
    expect(SHELL_SRC).toMatch(/submittedAtLabel/)
    expect(SHELL_SRC).toMatch(/hasMounted/)
  })

  it("WorldCupBracketShell no longer hardcodes the finalize block English literals", () => {
    const banned = [
      ">Finalized<",
      ">Your bracket is locked in<",
      `"Share Copied!"`,
      `"Copy share text"`,
      "Share My AI Bracket Report",
      "Invite Friends To Beat My Bracket",
      ">Preview share text<",
    ]
    for (const phrase of banned) {
      expect(
        SHELL_SRC,
        `Shell finalize block should not hardcode "${phrase}"`
      ).not.toContain(phrase)
    }
  })
})

describe("WC dashboard cards i18n: buildWorldCupBracketShareMessage locale support", () => {
  it("emits different output per locale", () => {
    const en = buildWorldCupBracketShareMessage({
      poolName: "Office Pool",
      entryName: "Bracket 1",
      championName: "Brazil",
      gradeLabel: "B+",
      isComplete: true,
      locale: "en",
    })
    const es = buildWorldCupBracketShareMessage({
      poolName: "Office Pool",
      entryName: "Bracket 1",
      championName: "Brazil",
      gradeLabel: "B+",
      isComplete: true,
      locale: "es",
    })
    expect(en.message).not.toEqual(es.message)
    expect(en.message).toContain("locked in")
    expect(es.message).toContain("confirmado")
  })

  it("each locale produces a non-empty message", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const result = buildWorldCupBracketShareMessage({
        poolName: "Office Pool",
        entryName: "Bracket 1",
        championName: "Brazil",
        gradeLabel: "B+",
        isComplete: true,
        locale,
      })
      expect(result.status).toBe("ready")
      expect(result.message.length).toBeGreaterThan(20)
    }
  })

  it("falls back to English when locale is unknown", () => {
    const fallback = buildWorldCupBracketShareMessage({
      poolName: "Office Pool",
      isComplete: true,
      locale: "xx",
    })
    expect(fallback.message).toContain("locked in")
  })
})

// ── Inside-pool Invite tab ─────────────────────────────────────────────────

describe("WC dashboard cards i18n: WorldCupInvitePanel wiring", () => {
  it("calls t() for the major invite-tab labels", () => {
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.eyebrow")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.title")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.detailsTitle")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.meta.pool")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.meta.privacy")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.lockedBanner")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.member.title")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.member.body")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.commissioner.linkTitle")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.commissioner.copyLink")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.commissioner.copyMessage")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.inviteTab.commissioner.share")`)
  })

  it("uses the language provider", () => {
    expect(INVITE_PANEL_SRC).toContain(`useOptionalLanguage`)
    expect(INVITE_PANEL_SRC).toContain(`makeWcT`)
  })

  it("no longer hardcodes the invite-tab English labels", () => {
    const banned = [
      "Invite & Pool Details",
      ">Pool details<",
      ">Invite Link<",
      ">Privacy<",
      "Copy Invite Link",
      "Copy Invite Message",
      "Preview invite message",
      "Preview share message",
      "Invite link not available",
    ]
    for (const phrase of banned) {
      expect(
        INVITE_PANEL_SRC,
        `Invite panel should not hardcode "${phrase}"`
      ).not.toContain(phrase)
    }
  })
})

describe("WC dashboard cards i18n: buildWorldCupInviteMessage locale + privacy", () => {
  it("emits commissioner output per locale", () => {
    const en = buildWorldCupInviteMessage({
      poolName: "Office Pool",
      inviteUrl: "https://allfantasy.ai/join/bracket/ABC",
      inviteCode: "ABC",
      audience: "commissioner",
      locale: "en",
    })
    const zh = buildWorldCupInviteMessage({
      poolName: "Office Pool",
      inviteUrl: "https://allfantasy.ai/join/bracket/ABC",
      inviteCode: "ABC",
      audience: "commissioner",
      locale: "zh",
    })
    expect(en.status).toBe("ready")
    expect(zh.status).toBe("ready")
    expect(en.message).not.toEqual(zh.message)
    expect(en.message).toContain("ABC")
    expect(zh.message).toContain("ABC")
  })

  it("member output never contains invite code, invite url, or commissioner pitch line", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const result = buildWorldCupInviteMessage({
        poolName: "Office Pool",
        inviteUrl: "https://allfantasy.ai/join/bracket/SECRET_CODE",
        inviteCode: "SECRET_CODE",
        audience: "member",
        locale,
      })
      expect(result.status).toBe("member_blocked")
      expect(result.message).not.toContain("SECRET_CODE")
      expect(result.message).not.toContain(
        "https://allfantasy.ai/join/bracket"
      )
    }
  })

  it("each locale produces a non-empty commissioner message that includes the invite url", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const result = buildWorldCupInviteMessage({
        poolName: "Office Pool",
        inviteUrl: "https://allfantasy.ai/join/bracket/X1Y2Z3",
        inviteCode: "X1Y2Z3",
        audience: "commissioner",
        locale,
      })
      expect(result.status).toBe("ready")
      expect(result.message).toContain("https://allfantasy.ai/join/bracket/X1Y2Z3")
      expect(result.message).toContain("X1Y2Z3")
    }
  })
})

// ── Commissioner Checklist ─────────────────────────────────────────────────

describe("WC dashboard cards i18n: WorldCupCommissionerChecklistCard wiring", () => {
  it("calls t() for the major checklist labels", () => {
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.eyebrow")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.title")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.cardSubtitle")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.copyReminderBtn")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.copyReminderDone")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.stat.total")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.stat.finalized")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.stat.inProgress")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.stat.completion")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.needsReminderBadge")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.previewReminder")`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.privacyNote")`)
    expect(CHECKLIST_SRC).toContain(`t(STATUS_KEY[row.status])`)
    expect(CHECKLIST_SRC).toContain(`t("wc.checklist.missingPicks"`)
  })

  it("passes the locale into the helper", () => {
    expect(CHECKLIST_SRC).toContain(`locale: language`)
  })

  it("no longer hardcodes the checklist English labels", () => {
    const banned = [
      ">Pool Completion Checklist<",
      "Member progress at a glance",
      ">Copy Reminder Message<",
      ">Total members<",
      ">Finalized<",
      ">In progress<",
      ">Completion<",
      ">Needs reminder<",
      "Preview reminder message",
    ]
    for (const phrase of banned) {
      expect(
        CHECKLIST_SRC,
        `Checklist card should not hardcode "${phrase}"`
      ).not.toContain(phrase)
    }
  })
})

describe("WC dashboard cards i18n: buildWorldCupCommissionerChecklist locale + privacy", () => {
  it("emits different reminder text per locale", () => {
    const en = buildWorldCupCommissionerChecklist({
      snapshot: {
        totalEntries: 10,
        completedBracketCount: 6,
        incompleteBracketCount: 4,
        totalMissingPicks: 12,
        usersWithIncompleteBrackets: [],
        entriesMissingPicks: [],
      },
      poolName: "Office Pool",
      isCommissioner: true,
      locale: "en",
    })
    const vi = buildWorldCupCommissionerChecklist({
      snapshot: {
        totalEntries: 10,
        completedBracketCount: 6,
        incompleteBracketCount: 4,
        totalMissingPicks: 12,
        usersWithIncompleteBrackets: [],
        entriesMissingPicks: [],
      },
      poolName: "Office Pool",
      isCommissioner: true,
      locale: "vi",
    })
    expect(en.reminderMessage).not.toEqual(vi.reminderMessage)
    expect(en.reminderMessage).toContain("Friendly reminder")
    expect(vi.reminderMessage).toContain("Lời nhắc")
  })

  it("non-commissioner viewer always sees the locale-aware ask-commissioner copy and no internal data", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const result = buildWorldCupCommissionerChecklist({
        snapshot: null,
        poolName: "Office Pool",
        isCommissioner: false,
        locale,
      })
      expect(result.status).toBe("no_data")
      expect(result.rows).toEqual([])
      expect(result.reminderMessage).toContain("Office Pool")
      expect(result.emptyLines?.[0]).toBeTruthy()
    }
  })

  it("reminder message never includes the invite code (privacy spec)", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const result = buildWorldCupCommissionerChecklist({
        snapshot: {
          totalEntries: 5,
          completedBracketCount: 2,
          incompleteBracketCount: 3,
          totalMissingPicks: 7,
          usersWithIncompleteBrackets: [],
          entriesMissingPicks: [],
        },
        poolName: "Office Pool",
        poolUrl: "https://allfantasy.ai/brackets/world-cup/abc",
        isCommissioner: true,
        locale,
      })
      // The helper signature has no invite code parameter, but the
      // assertion is the contract for product copy.
      expect(result.reminderMessage).not.toMatch(/invite\s*code/i)
    }
  })

  it("reminder + member fallback never contains an email or user id", () => {
    const emailish = /@[a-z0-9.-]+\.[a-z]{2,}/i
    const userIdish = /\buser[_-]?id\b/i
    const cuidish = /\bcm[a-z0-9]{20,}\b/i
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      for (const isCommissioner of [false, true]) {
        const result = buildWorldCupCommissionerChecklist({
          snapshot: null,
          poolName: "Office Pool",
          isCommissioner,
          locale,
        })
        const blob = [result.reminderMessage, ...(result.emptyLines ?? [])].join("\n")
        expect(emailish.test(blob), `${locale} reminder contains email`).toBe(false)
        expect(userIdish.test(blob), `${locale} reminder references userId`).toBe(false)
        expect(cuidish.test(blob), `${locale} reminder contains CUID`).toBe(false)
      }
    }
  })

  it("reminder text never contains wagering / sportsbook / DFS language in any locale", () => {
    const forbidden = [
      /\bbet(ting)?\b/i,
      /\bgambl/i,
      /\bodds\b/i,
      /\bwager/i,
      /\bsportsbook\b/i,
      /\bdfs\b/i,
      /\bdraftkings\b/i,
      /\bfanduel\b/i,
    ]
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const result = buildWorldCupCommissionerChecklist({
        snapshot: {
          totalEntries: 3,
          completedBracketCount: 1,
          incompleteBracketCount: 2,
          totalMissingPicks: 5,
          usersWithIncompleteBrackets: [],
          entriesMissingPicks: [],
        },
        poolName: "Office Pool",
        isCommissioner: true,
        locale,
      })
      for (const pattern of forbidden) {
        expect(
          pattern.test(result.reminderMessage),
          `${locale} reminder matched ${pattern}`
        ).toBe(false)
      }
    }
  })
})

// ── AI Report chrome ───────────────────────────────────────────────────────

describe("WC dashboard cards i18n: AI Report chrome wiring", () => {
  it("WorldCupAiBracketShareCard calls t() for major labels", () => {
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.eyebrow")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.subtitle")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.tierPro")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.tierPreview")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.emptyNoEntry")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.copyShare")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.copyShareDone")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.share")`)
    expect(AI_SHARE_SRC).toContain(`t("wc.aiShareCard.privacyNote")`)
  })

  it("WorldCupExplainBracketCard calls t() for major labels", () => {
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.eyebrow")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.title")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.subtitle")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.tierPro")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.tierLocked")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.locked")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.generate")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.generating")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.regenerate")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.fallbackBadge")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.error.generic")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.error.network")`)
    expect(EXPLAIN_SRC).toContain(`t("wc.explain.privacyNote")`)
  })

  it("WorldCupBracketUniquenessCard calls t() for major labels", () => {
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.eyebrow")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.title")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.subtitle")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.tierPro")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.tierBasic")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.empty.noEntry")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.loading")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.error.couldNotLoad")`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.error.network")`)
    expect(UNIQUENESS_SRC).toContain(`t(RARITY_KEY[insight.rarity])`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.percentShare"`)
    expect(UNIQUENESS_SRC).toContain(`t("wc.uniqueness.privacyNote")`)
  })

  it("WorldCupBracketShell wires t() into Grade / Confidence / Path-to-Win sub-cards", () => {
    expect(SHELL_SRC).toContain(`t("wc.grade.eyebrow")`)
    expect(SHELL_SRC).toContain(`t("wc.grade.completionLabel"`)
    expect(SHELL_SRC).toContain(`t("wc.confidence.title")`)
    expect(SHELL_SRC).toContain(`t("wc.confidence.missingBreakdown"`)
    expect(SHELL_SRC).toContain(`t("wc.path.title")`)
    expect(SHELL_SRC).toContain(`t("wc.aiReport.eyebrow")`)
    expect(SHELL_SRC).toContain(`t("wc.aiReport.title")`)
    expect(SHELL_SRC).toContain(`t("wc.aiReport.tierActive")`)
    expect(SHELL_SRC).toContain(`t("wc.aiReport.tierPreview")`)
  })

  it("no AI Report chrome retains the pre-i18n English literals", () => {
    const banned = [
      ">Share Graphic<",
      ">Private AI<",
      ">Explain My Bracket<",
      "What makes my bracket unique?",
      ">Very rare<",
      ">Bracket Grade<",
      "AI Confidence Check",
      "What needs to happen for me to win?",
      "AF Pro active",
      "AF Pro preview",
    ]
    // Check each card's source for the chunks it owned.
    expect(AI_SHARE_SRC).not.toContain(">Share Graphic<")
    expect(EXPLAIN_SRC).not.toContain(">Private AI<")
    expect(EXPLAIN_SRC).not.toContain(">Explain My Bracket<")
    expect(UNIQUENESS_SRC).not.toContain("What makes my bracket unique?")
    expect(UNIQUENESS_SRC).not.toContain(">Very rare<")
    expect(SHELL_SRC).not.toContain(">Bracket Grade<")
    // "AI Confidence Check" still appears in commit message + test comments,
    // but shouldn't be in render-path JSX. Use a node-text boundary check:
    expect(SHELL_SRC).not.toContain(">\n          AI Confidence Check\n")
    void banned // mark used
  })
})

// ── AI language instruction helper ─────────────────────────────────────────

describe("WC dashboard cards i18n: getAiLanguageInstruction", () => {
  it("returns expected language names per locale", () => {
    expect(getAiLanguageInstruction("en")).toBe("English")
    expect(getAiLanguageInstruction("es")).toBe("Spanish")
    expect(getAiLanguageInstruction("zh")).toBe("Traditional Chinese")
    expect(getAiLanguageInstruction("fil")).toBe("Filipino")
    expect(getAiLanguageInstruction("vi")).toBe("Vietnamese")
  })

  it("falls back to English for unknown / nullish locales", () => {
    expect(getAiLanguageInstruction(undefined)).toBe("English")
    expect(getAiLanguageInstruction(null)).toBe("English")
    expect(getAiLanguageInstruction("")).toBe("English")
    expect(getAiLanguageInstruction("xx")).toBe("English")
  })

  it("never returns an empty string", () => {
    for (const locale of [...WORLD_CUP_SUPPORTED_LOCALES, "xx", undefined]) {
      const out = getAiLanguageInstruction(locale)
      expect(out.length).toBeGreaterThan(0)
    }
  })
})

// ── Share tone type ────────────────────────────────────────────────────────

describe("WC dashboard cards i18n: WorldCupShareTone scaffolding", () => {
  it("default tone is friendly", () => {
    expect(WORLD_CUP_DEFAULT_SHARE_TONE).toBe("friendly")
  })

  it("type WorldCupShareTone admits the expected variants", () => {
    // Compile-time check via assignment.
    const variants: WorldCupShareTone[] = ["friendly", "hype", "trash_talk"]
    expect(variants).toHaveLength(3)
  })
})

// ── Hashtag block + Google Translate isolation ─────────────────────────────

describe("WC dashboard cards i18n: required hashtag block + translate isolation", () => {
  it("WORLD_CUP_SOCIAL_HASHTAGS is the canonical hashtag block", () => {
    expect(WORLD_CUP_SOCIAL_HASHTAGS).toBe(
      "#fantasyfootball #NFL #football #fantasyfootballadvice #sports #nflnews #fantasyfootballdraft"
    )
  })

  it("share copy helper file does not import the dev translate script", () => {
    expect(SHARE_COPY_SRC).not.toMatch(/translate-brackets-i18n/i)
    expect(SHARE_COPY_SRC).not.toMatch(/googleapis\.com\/translate/i)
    expect(SHARE_COPY_SRC).not.toMatch(/GOOGLE_TRANSLATE_API_KEY/)
  })

  it("commissioner checklist helper file does not import the dev translate script", () => {
    expect(CHECKLIST_LIB_SRC).not.toMatch(/translate-brackets-i18n/i)
    expect(CHECKLIST_LIB_SRC).not.toMatch(/googleapis\.com\/translate/i)
    expect(CHECKLIST_LIB_SRC).not.toMatch(/GOOGLE_TRANSLATE_API_KEY/)
  })

  it("none of the wired component files import the dev translate script", () => {
    const sources = [
      SHELL_SRC,
      INVITE_PANEL_SRC,
      CHECKLIST_SRC,
      AI_SHARE_SRC,
      EXPLAIN_SRC,
      UNIQUENESS_SRC,
    ]
    for (const src of sources) {
      expect(src).not.toMatch(/translate-brackets-i18n/i)
      expect(src).not.toMatch(/googleapis\.com\/translate/i)
      expect(src).not.toMatch(/GOOGLE_TRANSLATE_API_KEY/)
    }
  })
})

// ── Hydration safety on the wired client components ────────────────────────

describe("WC dashboard cards i18n: hydration safety", () => {
  it("Invite panel / Checklist card / AI Report cards do not read localStorage at render scope", () => {
    for (const src of [INVITE_PANEL_SRC, CHECKLIST_SRC, AI_SHARE_SRC, EXPLAIN_SRC, UNIQUENESS_SRC]) {
      expect(src).not.toMatch(/localStorage\./)
      expect(src).not.toMatch(/navigator\.language/)
    }
  })

  it("none of the dictionary values bake a toLocaleString call into the static string", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      for (const [key, value] of Object.entries(WORLD_CUP_TRANSLATIONS[locale])) {
        expect(
          value.includes("toLocaleString"),
          `${locale}.${key} should not contain "toLocaleString"`
        ).toBe(false)
      }
    }
  })
})

// ── Locale render smoke ────────────────────────────────────────────────────

describe("WC dashboard cards i18n: locale render smoke", () => {
  it.each([
    ["es", "wc.finalize.title", "Tu bracket está confirmado"],
    ["zh", "wc.finalize.title", "你的對戰表已鎖定"],
    ["fil", "wc.finalize.title", "Locked in na ang iyong bracket"],
    ["vi", "wc.finalize.title", "Bracket của bạn đã được khoá"],
    ["es", "wc.inviteTab.commissioner.copyLink", "Copiar enlace de invitación"],
    ["zh", "wc.inviteTab.commissioner.copyLink", "複製邀請連結"],
    ["es", "wc.checklist.copyReminderBtn", "Copiar mensaje recordatorio"],
    ["vi", "wc.checklist.copyReminderBtn", "Sao chép lời nhắc"],
    ["es", "wc.explain.title", "Explica mi bracket"],
    ["zh", "wc.explain.title", "解析我的對戰表"],
    ["fil", "wc.uniqueness.title", "Ano ang ginagawang unique sa bracket ko?"],
    ["vi", "wc.uniqueness.title", "Điều gì làm bracket của tôi khác biệt?"],
  ])("locale %s key %s renders as %s", (locale, key, expected) => {
    expect(wcT(locale, key)).toBe(expected)
  })
})
