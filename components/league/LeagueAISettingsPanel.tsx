'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'

type AILeagueToggle = {
  id: string
  label: string
  description: string
  category: string
}

const COMMISSIONER_AI_TOGGLES: AILeagueToggle[] = [
  // Content
  { id: 'ai_power_rankings', label: 'Power Rankings', description: 'AI-generated weekly league power rankings', category: 'content' },
  { id: 'ai_weekly_recap', label: 'Weekly Recaps', description: 'Matchup recaps with narrative storytelling', category: 'content' },
  { id: 'ai_league_storyteller', label: 'Storylines', description: 'Dynasty arcs, rivalry tracking, team narratives', category: 'content' },
  { id: 'ai_draft_grade', label: 'Draft Grades', description: 'Post-draft AI analysis for all teams', category: 'content' },
  { id: 'ai_social_content', label: 'Social Content', description: 'Shareable recap cards and social posts', category: 'content' },

  // Moderation
  { id: 'ai_collusion_detection', label: 'Collusion Detection', description: 'Flag suspicious trades and behavior patterns', category: 'moderation' },
  { id: 'ai_inactive_detection', label: 'Inactive Detection', description: 'Alert when managers stop setting lineups', category: 'moderation' },
  { id: 'ai_anomaly_detection', label: 'Anomaly Detection', description: 'Detect unusual draft/trade/roster patterns', category: 'moderation' },

  // Draft
  { id: 'ai_managers', label: 'AI Managers (up to 4)', description: 'AI-controlled teams for drafts and orphan slots', category: 'draft' },
  { id: 'ai_draft_room_adp', label: 'AI ADP Trends', description: 'Live ADP adjustments in draft room', category: 'draft' },
  { id: 'ai_draft_recap', label: 'Draft Recap', description: 'AI-generated post-draft summary', category: 'draft' },

  // Automation
  { id: 'ai_weekly_briefing', label: 'Weekly Briefings', description: 'Personalized pre-game DMs to each manager', category: 'automation' },
  { id: 'ai_injury_alerts', label: 'Smart Injury Alerts', description: 'AI-contextualized injury impact notifications', category: 'automation' },
  { id: 'ai_trade_review', label: 'AI Trade Review', description: 'Auto-review trades for fairness before approval', category: 'automation' },

  // Specialty
  { id: 'ai_chimmy_host', label: 'Chimmy Host Mode', description: 'AI hosts mini-games and challenges (Survivor/BB)', category: 'specialty' },
  { id: 'ai_confessionals', label: 'AI Confessionals', description: 'AI-generated confessionals for social leagues', category: 'specialty' },
]

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  content: { label: 'Content & Recaps', icon: '📝' },
  moderation: { label: 'Moderation & Fairness', icon: '🛡️' },
  draft: { label: 'Draft Room', icon: '📋' },
  automation: { label: 'Automation', icon: '⚙️' },
  specialty: { label: 'Specialty Leagues', icon: '🏝️' },
}

/**
 * League-level AI settings panel for commissioners.
 * Controls which AI features are active for the entire league.
 * Gated behind AF Commissioner subscription.
 */
export function LeagueAISettingsPanel({
  leagueId,
  hasAfCommissionerSub,
}: {
  leagueId: string
  hasAfCommissionerSub: boolean
}) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch(`/api/league/settings?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { settings?: Record<string, unknown> } | null) => {
        const s = d?.settings ?? {}
        const aiSettings = (s.ai_league_settings ?? {}) as Record<string, boolean>
        setToggles(aiSettings)
      })
      .catch(() => null)
  }, [leagueId])

  async function handleToggle(id: string, value: boolean) {
    if (!hasAfCommissionerSub) return
    const updated = { ...toggles, [id]: value }
    setToggles(updated)
    setStatus('Saving...')

    await fetch('/api/league/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        leagueId,
        ai_league_settings: updated,
      }),
    }).catch(() => null)

    setStatus('Saved')
    setTimeout(() => setStatus(''), 2000)
  }

  const categories = [...new Set(COMMISSIONER_AI_TOGGLES.map((t) => t.category))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">League AI Features</h3>
          <p className="mt-0.5 text-xs text-white/40">
            {hasAfCommissionerSub
              ? 'Toggle AI features for this league.'
              : 'Upgrade to AF Commissioner to unlock AI features.'}
          </p>
        </div>
        {status && <span className="text-[11px] text-emerald-400">{status}</span>}
      </div>

      {!hasAfCommissionerSub && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
          <p className="text-xs text-amber-300">
            AF Commissioner subscription required to enable league AI features.
          </p>
        </div>
      )}

      {/* Toggle groups by category */}
      {categories.map((cat) => {
        const catInfo = CATEGORY_LABELS[cat]
        const catToggles = COMMISSIONER_AI_TOGGLES.filter((t) => t.category === cat)
        return (
          <section key={cat} className="rounded-xl border border-white/10 bg-white/[0.02] px-4">
            <h4 className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/50">
              {catInfo?.icon} {catInfo?.label}
            </h4>
            {catToggles.map((toggle) => (
              <div
                key={toggle.id}
                className={clsx(
                  'flex items-center justify-between gap-4 border-b border-white/5 py-2.5 last:border-0',
                  !hasAfCommissionerSub && 'opacity-50',
                )}
              >
                <div className="min-w-0">
                  <span className="text-sm text-white/80">{toggle.label}</span>
                  <p className="text-[11px] text-white/40">{toggle.description}</p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={hasAfCommissionerSub ? (toggles[toggle.id] ?? true) : false}
                    onChange={(e) => handleToggle(toggle.id, e.target.checked)}
                    disabled={!hasAfCommissionerSub}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white/40 after:transition-all peer-checked:bg-purple-500/50 peer-checked:after:translate-x-full peer-checked:after:bg-purple-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-40" />
                </label>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
