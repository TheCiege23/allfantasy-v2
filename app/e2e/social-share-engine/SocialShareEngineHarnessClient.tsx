'use client'

import { useEffect, useMemo, useState } from 'react'
import { Share2 } from 'lucide-react'
import { ShareModal } from '@/components/share'
import { useShareModal } from '@/hooks/useShareModal'
import type { ShareDestination, SharePayloadRequest, ShareableKind } from '@/lib/share-engine/types'

type ShareScenario = {
  kind: ShareableKind
  label: string
  summary: string
  request: SharePayloadRequest
}

const SCENARIOS: ShareScenario[] = [
  {
    kind: 'league_invite',
    label: 'League invite',
    summary: 'Private-safe invite preview for a commissioner league.',
    request: {
      kind: 'league_invite',
      url: '/invite/accept?code=LEAGUE145',
      title: 'Diamond League invite',
      description: 'Join our high-activity league room.',
      sport: 'NFL',
      leagueName: 'Diamond League',
      visibility: 'invite_only',
      safeForPublic: false,
      cta: 'Open invite',
    },
  },
  {
    kind: 'bracket_invite',
    label: 'Bracket invite',
    summary: 'Public tournament challenge with a fast bracket CTA.',
    request: {
      kind: 'bracket_invite',
      url: '/brackets/leagues/march-bash',
      title: 'March Bash bracket invite',
      description: 'Pick the field and climb the standings.',
      sport: 'NCAAB',
      bracketName: 'March Bash',
      visibility: 'public',
      safeForPublic: true,
      weekOrRound: 'Round 1',
    },
  },
  {
    kind: 'ai_result_card',
    label: 'AI result card',
    summary: 'Public-safe DeepSeek, Grok, and OpenAI summary card.',
    request: {
      kind: 'ai_result_card',
      url: '/share/ai-result-145',
      title: 'AI Trade Verdict',
      description: 'DeepSeek and OpenAI agree this move adds playoff ceiling without exposing roster internals.',
      sport: 'NBA',
      visibility: 'public',
      safeForPublic: true,
    },
  },
  {
    kind: 'matchup_result',
    label: 'Matchup result',
    summary: 'Shareable matchup card with week context and sport styling.',
    request: {
      kind: 'matchup_result',
      url: '/share/matchup-145',
      title: 'Week 9 matchup result',
      description: 'A close projection turned into a statement win.',
      sport: 'NFL',
      weekOrRound: 'Week 9',
      visibility: 'public',
      safeForPublic: true,
    },
  },
  {
    kind: 'power_rankings',
    label: 'Power rankings',
    summary: 'League rankings card with public-safe ordering context.',
    request: {
      kind: 'power_rankings',
      url: '/share/power-rankings-145',
      leagueName: 'Sunday Legends',
      sport: 'MLB',
      visibility: 'public',
      safeForPublic: true,
    },
  },
  {
    kind: 'story_recap',
    label: 'Story recap',
    summary: 'Narrative recap card for league or creator content.',
    request: {
      kind: 'story_recap',
      url: '/share/story-recap-145',
      leagueName: 'Studio League',
      title: 'Week 11 studio recap',
      description: 'Upsets, waiver hits, and one huge comeback defined the week.',
      sport: 'NHL',
      weekOrRound: 'Week 11',
      visibility: 'public',
      safeForPublic: true,
    },
  },
  {
    kind: 'creator_league_promo',
    label: 'Creator league promo',
    summary: 'Creator-branded promo card with community-safe copy.',
    request: {
      kind: 'creator_league_promo',
      url: '/creator/leagues/alpha-room?join=ALPHA145',
      leagueName: 'Alpha Creator Room',
      creatorName: 'Alpha Creator',
      description: 'Creator-led competition with weekly recaps and community strategy drops.',
      sport: 'SOCCER',
      visibility: 'public',
      safeForPublic: true,
      cta: 'Join creator league',
    },
  },
  {
    kind: 'player_comparison',
    label: 'Player comparison',
    summary: 'Comparison result card for side-by-side player debates.',
    request: {
      kind: 'player_comparison',
      url: '/share/player-comparison-145',
      title: 'Amon-Ra vs Puka',
      description: 'A weekly floor vs ceiling comparison for lineup decisions.',
      sport: 'NFL',
      visibility: 'public',
      safeForPublic: true,
    },
  },
]

export default function SocialShareEngineHarnessClient() {
  const [hydrated, setHydrated] = useState(false)
  const [activeKind, setActiveKind] = useState<ShareableKind>('league_invite')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Ready to open a share preview.')
  const [lastDestination, setLastDestination] = useState('none')
  const shareModal = useShareModal()

  useEffect(() => {
    setHydrated(true)
  }, [])

  const activeScenario = useMemo(
    () => SCENARIOS.find((scenario) => scenario.kind === activeKind) ?? SCENARIOS[0],
    [activeKind]
  )

  const openScenario = async (scenario: ShareScenario) => {
    setActiveKind(scenario.kind)
    setLoading(true)
    setStatus(`Building ${scenario.label.toLowerCase()} payload...`)

    try {
      const response = await fetch('/api/share/payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario.request),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.payload) {
        setStatus('Unable to build the share payload.')
        return
      }

      shareModal.openShare(payload.payload, { surface: 'social_share_harness' })
      setStatus(`Opened ${scenario.label.toLowerCase()} share preview.`)
    } catch {
      setStatus('Unable to build the share payload.')
    } finally {
      setLoading(false)
    }
  }

  const handleShareComplete = (destination: ShareDestination) => {
    setLastDestination(destination)
    setStatus(`Completed share action: ${destination}.`)
  }

  return (
    <div className="min-h-screen bg-[#07111f] px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Social Share Engine Harness</h1>
          <p className="text-sm text-white/70">
            Deterministic harness for premium share previews, platform actions, and analytics hooks.
          </p>
          <p className="text-xs text-white/50" data-testid="social-share-hydrated-flag">
            {hydrated ? 'hydrated' : 'hydrating'}
          </p>
        </div>

        {hydrated ? (
          <>
            <section
              className="rounded-[28px] border border-white/10 bg-white/5 p-5"
              data-testid="social-share-status-panel"
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Active object</p>
                  <p className="mt-2 text-lg font-semibold" data-testid="social-share-active-kind">
                    {activeScenario.label}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Last destination</p>
                  <p className="mt-2 text-lg font-semibold" data-testid="social-share-last-destination">
                    {lastDestination}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Status</p>
                  <p className="mt-2 text-sm text-white/80" data-testid="social-share-status">
                    {status}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="social-share-grid">
              {SCENARIOS.map((scenario) => (
                <article
                  key={scenario.kind}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                  data-testid={`share-card-${scenario.kind}`}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">{scenario.kind.replace(/_/g, ' ')}</p>
                  <h2 className="mt-2 text-lg font-semibold">{scenario.label}</h2>
                  <p className="mt-2 text-sm text-white/70">{scenario.summary}</p>
                  <button
                    type="button"
                    onClick={() => void openScenario(scenario)}
                    disabled={loading}
                    data-testid={`share-launch-${scenario.kind}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </article>
              ))}
            </section>

            {shareModal.hasPayload ? (
              <ShareModal
                open={shareModal.open}
                onOpenChange={shareModal.onOpenChange}
                payload={shareModal.payload}
                onShareComplete={handleShareComplete}
              />
            ) : null}
          </>
        ) : (
          <div
            className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-white/70"
            data-testid="social-share-loading-shell"
          >
            Preparing premium share controls...
          </div>
        )}
      </div>
    </div>
  )
}
