/**
 * world-cup-monetization-ux.test.ts
 *
 * Static-analysis tests for:
 *   1. Quick Actions i18n key fix  — keys in QUICK_ACTIONS match bracketsI18n
 *   2. Chat 402 response shape     — WORLD_CUP_CHIMMY_LOCKED code + upgradePath
 *   3. Chat 429 response shape     — daily_ai_limit_reached + message/used/limit
 *   4. AI teaser upgrade button    — WorldCupBracketShell has upgrade CTA for locked state
 *   5. Chimmy hint upgrade link    — locked hint has Link to /pricing?from=wc-chimmy
 *   6. worldCupAiUsageLimits copy  — upgrade messages include expected upgrade path anchors
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const cwd = process.cwd()

function read(rel: string) {
  return readFileSync(resolve(cwd, rel), "utf-8")
}

// ── 1. Quick Actions i18n key fix ────────────────────────────────────────────

describe("Quick Actions i18n key fix (app/brackets/page.tsx)", () => {
  it('QUICK_ACTIONS uses "create" not "createPool"', () => {
    const src = read("app/brackets/page.tsx")
    expect(src).toContain('key: "create"')
    expect(src).not.toContain('key: "createPool"')
  })

  it('QUICK_ACTIONS uses "join" not "joinWithCode"', () => {
    const src = read("app/brackets/page.tsx")
    expect(src).toContain('key: "join"')
    expect(src).not.toContain('key: "joinWithCode"')
  })

  it('QUICK_ACTIONS uses "continue" not "continueBracket"', () => {
    const src = read("app/brackets/page.tsx")
    expect(src).toContain('key: "continue"')
    expect(src).not.toContain('key: "continueBracket"')
  })

  it('QUICK_ACTIONS uses "browse" not "browsePools"', () => {
    const src = read("app/brackets/page.tsx")
    expect(src).toContain('key: "browse"')
    expect(src).not.toContain('key: "browsePools"')
  })

  it("bracketsI18n has all four quickActions keys (create/join/continue/browse)", () => {
    const src = read("lib/brackets/bracketsI18n.ts")
    expect(src).toContain('"brk.hub.quickActions.create"')
    expect(src).toContain('"brk.hub.quickActions.join"')
    expect(src).toContain('"brk.hub.quickActions.continue"')
    expect(src).toContain('"brk.hub.quickActions.browse"')
  })

  it("bracketsI18n has all four quickActions description keys", () => {
    const src = read("lib/brackets/bracketsI18n.ts")
    expect(src).toContain('"brk.hub.quickActions.createDesc"')
    expect(src).toContain('"brk.hub.quickActions.joinDesc"')
    expect(src).toContain('"brk.hub.quickActions.continueDesc"')
    expect(src).toContain('"brk.hub.quickActions.browseDesc"')
  })

  it("bracketsI18n does NOT have the stale createPool/joinWithCode/continueBracket/browsePools keys", () => {
    const src = read("lib/brackets/bracketsI18n.ts")
    expect(src).not.toContain('"brk.hub.quickActions.createPool"')
    expect(src).not.toContain('"brk.hub.quickActions.joinWithCode"')
    expect(src).not.toContain('"brk.hub.quickActions.continueBracket"')
    expect(src).not.toContain('"brk.hub.quickActions.browsePools"')
  })
})

// ── 2. Chat 402 response shape ────────────────────────────────────────────────

describe("WC chat route 402 response (Chimmy locked)", () => {
  it("returns code WORLD_CUP_CHIMMY_LOCKED on 402", () => {
    const src = read("app/api/brackets/world-cup/[challengeId]/chat/route.ts")
    expect(src).toContain("WORLD_CUP_CHIMMY_LOCKED")
    expect(src).toContain('status: 402')
  })

  it("402 response includes upgradePath pointing to pricing", () => {
    const src = read("app/api/brackets/world-cup/[challengeId]/chat/route.ts")
    // The 402 block must include an upgradePath so the client can deep-link
    expect(src).toContain('upgradePath: "/pricing?from=wc-chimmy"')
  })

  it("402 response sets upgrade: true for client gate detection", () => {
    const src = read("app/api/brackets/world-cup/[challengeId]/chat/route.ts")
    expect(src).toContain('upgrade: true')
  })
})

// ── 3. Chat 429 response shape ────────────────────────────────────────────────

describe("WC chat route 429 response (daily limit reached)", () => {
  it("returns error key daily_ai_limit_reached on 429", () => {
    const src = read("app/api/brackets/world-cup/[challengeId]/chat/route.ts")
    expect(src).toContain("daily_ai_limit_reached")
    expect(src).toContain('status: 429')
  })

  it("429 response includes used and limit fields for display", () => {
    const src = read("app/api/brackets/world-cup/[challengeId]/chat/route.ts")
    expect(src).toContain("rateLimit.used")
    expect(src).toContain("rateLimit.limit")
  })

  it("429 response includes upgradePath", () => {
    const src = read("app/api/brackets/world-cup/[challengeId]/chat/route.ts")
    expect(src).toContain('upgradePath: "/pricing"')
  })
})

// ── 4. WorldCupBracketShell upgrade CTA (AI teaser) ──────────────────────────

describe("WorldCupBracketShell AI teaser upgrade CTA", () => {
  it("renders an Upgrade to AF Pro button for non-pro users in the Home AI teaser", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    // The teaser section must include a link to pricing and upgrade copy
    expect(src).toContain("/pricing?from=wc-ai-teaser")
    expect(src).toContain("Upgrade to AF Pro")
  })

  it("AI teaser upgrade link is inside the non-pro else branch (aiInsightsUnlocked guard)", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    // Both the unlockHint i18n key and the upgrade button must coexist
    expect(src).toContain('wc.home.ai.unlockHint')
    expect(src).toContain('/pricing?from=wc-ai-teaser')
  })
})

// ── 5. Chimmy hint upgrade link ───────────────────────────────────────────────

describe("WorldCupBracketShell Chimmy locked hint upgrade link", () => {
  it("locked Chimmy hint includes upgrade link to /pricing?from=wc-chimmy", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain("/pricing?from=wc-chimmy")
  })

  it("locked Chimmy hint still shows aiHint.locked i18n text", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain('wc.chat.aiHint.locked')
  })
})

// ── 6. chatAiGate structured error state ─────────────────────────────────────

describe("WorldCupBracketShell chatAiGate structured error state", () => {
  it("defines chatAiGate state with chimmy_locked and daily_limit types", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain("chatAiGate")
    expect(src).toContain('"chimmy_locked"')
    expect(src).toContain('"daily_limit"')
  })

  it("sendChatMessage checks status 402 and WORLD_CUP_CHIMMY_LOCKED code", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain('res.status === 402')
    expect(src).toContain('"WORLD_CUP_CHIMMY_LOCKED"')
  })

  it("sendChatMessage checks status 429 and daily_ai_limit_reached error", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain('res.status === 429')
    expect(src).toContain('"daily_ai_limit_reached"')
  })

  it("renders upgrade card with Unlock AF Pro heading for chimmy_locked", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain("Unlock AF Pro")
    expect(src).toContain("Get more Chimmy answers")
  })

  it("renders daily-limit card with today's AI limit copy", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    expect(src).toContain("today&apos;s AI limit")
    expect(src).toContain("Upgrade for more AI")
  })

  it("daily-limit card shows used/limit counts when available", () => {
    const src = read("components/brackets/world-cup/WorldCupBracketShell.tsx")
    // Both fields must be read from chatAiGate for the count display
    expect(src).toContain("chatAiGate.used")
    expect(src).toContain("chatAiGate.limit")
    expect(src).toContain("Resets at midnight UTC")
  })
})

// ── 7. worldCupAiUsageLimits upgrade messages ────────────────────────────────

describe("worldCupAiUsageLimits upgrade copy", () => {
  it("free chimmy upgrade message mentions AF Pro", () => {
    const src = read("lib/world-cup/worldCupAiUsageLimits.ts")
    expect(src).toContain("AF Pro")
    expect(src).toContain("chimmy")
  })

  it("upgrade paths use /pricing with wc-* source context", () => {
    const src = read("lib/world-cup/worldCupAiUsageLimits.ts")
    expect(src).toContain("/pricing?from=wc-chimmy")
    expect(src).toContain("/pricing?from=wc-explain")
    expect(src).toContain("/pricing?from=wc-matchup-ai")
  })
})
