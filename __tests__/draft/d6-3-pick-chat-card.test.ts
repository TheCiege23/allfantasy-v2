/**
 * D.6.3 — pick chat notifications with player headshot + drafter name.
 *
 * Verifies the four edges of the pipeline:
 *  1. PickSubmissionService passes headshot + aiManager into postDraftPickChatEvent
 *  2. postDraftPickChatEvent writes those fields into LeagueChatMessage.metadata
 *  3. buildDraftChatWireMessage rehydrates them into DraftPickMetaWire on read
 *  4. DraftChatPanel renders headshot + drafter name + AI badge correctly
 *
 * Mix of:
 *  - static-source assertions (matches existing D.6.x test style for the
 *    server emit + render layers — unit-rendering DraftChatPanel through
 *    JSDOM would force us to also bring in the chat input toolbar and the
 *    GIF picker stack, which is too heavy for this slice)
 *  - a real unit test of buildDraftChatWireMessage's contract handling
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildDraftChatWireMessage } from '@/lib/draft-room/draft-chat-contract'
import type { PlatformChatMessage } from '@/types/platform-shared'

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const opts = {
  syncActive: false,
  leagueId: 'lg-1',
  sanitizePlayerContext: () => null,
  parsePollPayload: () => null,
}

function pickRow(metaOverride: Record<string, unknown> = {}): PlatformChatMessage {
  return {
    id: 'msg-1',
    threadId: 't1',
    senderUserId: 'u-1',
    senderName: 'Alex',
    messageType: 'draft_pick',
    body: 'Ja\'Marr Chase (WR) → TheCiege24 · Pick 1.01 (#1)',
    createdAt: '2026-04-25T22:00:00.000Z',
    channelSource: 'draft',
    metadata: {
      draftPickEvent: true,
      playerName: "Ja'Marr Chase",
      position: 'WR',
      rosterDisplayName: 'TheCiege24',
      pickedAt: '2026-04-25T22:00:00.000Z',
      overall: 1,
      pickLabel: '1.01',
      round: 1,
      roundSlot: 1,
      playerId: 'sl-2104',
      nflTeam: 'CIN',
      ...metaOverride,
    },
  }
}

describe('D.6.3 — buildDraftChatWireMessage rehydrates new fields', () => {
  it('passes headshotUrl through from metadata', () => {
    const wire = buildDraftChatWireMessage(
      pickRow({ headshotUrl: 'https://r2.thesportsdb.com/images/cutout/jc.png' }),
      opts,
    )
    expect(wire.isDraftPickEvent).toBe(true)
    expect(wire.draftPickMeta?.headshotUrl).toBe('https://r2.thesportsdb.com/images/cutout/jc.png')
  })

  it('passes teamLogoUrl through from metadata', () => {
    const wire = buildDraftChatWireMessage(
      pickRow({ teamLogoUrl: 'https://example.com/cin.png' }),
      opts,
    )
    expect(wire.draftPickMeta?.teamLogoUrl).toBe('https://example.com/cin.png')
  })

  it('passes aiManager=true through from metadata', () => {
    const wire = buildDraftChatWireMessage(pickRow({ aiManager: true }), opts)
    expect(wire.draftPickMeta?.aiManager).toBe(true)
  })

  it('aiManager defaults to null when not set (renderer treats it as falsy)', () => {
    const wire = buildDraftChatWireMessage(pickRow(), opts)
    expect(wire.draftPickMeta?.aiManager).toBeNull()
  })

  it('headshotUrl/teamLogoUrl default to null when missing (graceful degrade)', () => {
    const wire = buildDraftChatWireMessage(pickRow(), opts)
    expect(wire.draftPickMeta?.headshotUrl).toBeNull()
    expect(wire.draftPickMeta?.teamLogoUrl).toBeNull()
  })

  it('non-pick rows do not get a draftPickMeta payload', () => {
    const m: PlatformChatMessage = {
      id: 'msg-2',
      threadId: 't1',
      senderUserId: 'u-1',
      senderName: 'Alex',
      messageType: 'text',
      body: 'gl hf',
      createdAt: '2026-04-25T22:00:00.000Z',
      channelSource: 'draft',
      metadata: {},
    }
    const wire = buildDraftChatWireMessage(m, opts)
    expect(wire.isDraftPickEvent).toBeUndefined()
    expect(wire.draftPickMeta).toBeUndefined()
  })

  it('pick rows are NEVER synced to league chat (regression guard)', () => {
    const wire = buildDraftChatWireMessage(pickRow(), { ...opts, syncActive: true })
    expect(wire.syncToLeagueChat).toBe(false)
  })
})

describe('D.6.3 — postDraftPickChatEvent writes the new metadata', () => {
  const src = read('lib/draft-room/postDraftPickChatEvent.ts')

  it('PostDraftPickChatEventInput accepts headshotUrl, teamLogoUrl, aiManager', () => {
    expect(src).toMatch(/headshotUrl\?: string \| null/)
    expect(src).toMatch(/teamLogoUrl\?: string \| null/)
    expect(src).toMatch(/aiManager\?: boolean/)
  })

  it('headshotUrl is persisted when non-empty', () => {
    expect(src).toMatch(/typeof input\.headshotUrl === 'string' && input\.headshotUrl\.trim\(\)/)
    expect(src).toMatch(/headshotUrl: input\.headshotUrl\.trim\(\)/)
  })

  it('aiManager is only written when explicitly true (no false poisoning)', () => {
    expect(src).toMatch(/input\.aiManager === true \? \{ aiManager: true \} : \{\}/)
  })
})

describe('D.6.3 — PickSubmissionService passes headshot + aiManager', () => {
  const src = read('lib/live-draft-engine/PickSubmissionService.ts')

  it('forwards pick.playerImageUrl as headshotUrl', () => {
    expect(src).toMatch(/headshotUrl: pick\.playerImageUrl \?\? input\.playerImageUrl \?\? null/)
  })

  it('flips aiManager=true when input.source === "auto"', () => {
    expect(src).toMatch(/aiManager: input\.source === 'auto'/)
  })
})

describe('D.6.3 — DraftChatPanel renders the rich pick card', () => {
  const src = read('components/app/draft-room/DraftChatPanel.tsx')

  it('headshot wrapper has its own testid for QA + e2e', () => {
    // Player image now renders via shared PlayerAvatar; the testid base is preserved
    // so e2e/QA selectors keep working (PlayerAvatar emits `${testIdBase}-root`,
    // `${testIdBase}-image`, `${testIdBase}-fallback` in the DOM).
    expect(src).toMatch(/testIdBase="draft-chat-pick-headshot"/)
    expect(src).toMatch(/<PlayerAvatar/)
  })

  it('drafter name has its own testid (the "To {team}" line)', () => {
    expect(src).toMatch(/data-testid="draft-chat-pick-drafter"/)
  })

  it('renders an AI badge with its own testid when aiManager is true', () => {
    expect(src).toMatch(/data-testid="draft-chat-pick-ai-badge"/)
    // The badge only appears inside the `isAi` ternary — assert that gate.
    expect(src).toMatch(/isAi \? \(/)
  })

  it('exposes data-ai-manager on the card root for selectors / a11y tooling', () => {
    expect(src).toMatch(/data-ai-manager=\{isAi \? 'true' : 'false'\}/)
  })

  it('delegates initials/silhouette fallback to shared PlayerAvatar', () => {
    // PlayerAvatar centralizes: silhouette+initials when headshotUrl is null,
    // initials when image fails to load, and DEF team-logo promotion. We assert
    // the import + usage rather than reproducing the fallback markup here.
    expect(src).toMatch(/import \{ PlayerAvatar \} from '\.\/PlayerAvatar'/)
    expect(src).toMatch(/headshotUrl=\{headshot\}/)
    expect(src).toMatch(/displayName=\{meta\?\.playerName \?\? 'Player'\}/)
  })

  it('preserves drafter name (rosterDisplayName) — D.6.3 must not lose it', () => {
    expect(src).toMatch(/meta\?\.rosterDisplayName \?\? 'Team'/)
  })

  it('shows player position + NFL team next to the name', () => {
    // Position chip
    expect(src).toMatch(/\{meta\.position\}/)
    // Team chip — NFL team renders next to position now
    expect(src).toMatch(/\{meta\.nflTeam\}/)
  })
})

describe('D.6.3 — no forbidden BaaS references', () => {
  const FORBIDDEN = 'supa' + 'base'
  const filesToCheck = [
    'lib/draft-room/postDraftPickChatEvent.ts',
    'lib/draft-room/draft-chat-contract.ts',
    'components/app/draft-room/DraftChatPanel.tsx',
  ]
  for (const rel of filesToCheck) {
    it(`${rel} contains no forbidden BaaS imports`, () => {
      const src = read(rel)
      expect(src.toLowerCase()).not.toContain(FORBIDDEN)
    })
  }
})
