'use client'

/**
 * Page 4 — Review.
 *
 * AI-summary-style overview of every choice. Each section has an "Edit"
 * link that jumps back to the relevant page.
 */

import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, V2PageId } from '@/lib/create-league-v2/state'
import { isFootballLike } from '@/lib/create-league-v2/state'
import { GlassCard, InnerPanel } from './primitives'

const LEAGUE_TYPE_LABEL: Record<string, string> = {
  redraft: 'Redraft',
  dynasty: 'Dynasty',
  keeper: 'Keeper',
  best_ball: 'Best Ball',
  salary_cap: 'Salary Cap',
  survivor: 'Survivor',
  guillotine: 'Guillotine',
  tournament: 'Tournament',
  devy: 'Devy',
  c2c: 'College to Pros',
  zombie: 'Zombie',
  big_brother: 'Big Brother',
}

const DRAFT_TYPE_LABEL: Record<string, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
  slow_draft: 'Slow Draft',
  mock_draft: 'Mock',
  devy_snake: 'Devy Snake',
  devy_auction: 'Devy Auction',
  c2c_snake: 'C2C Snake',
  c2c_auction: 'C2C Auction',
}

const SCORING_LABEL = {
  af: 'AllFantasy Default',
  sleeper: 'Sleeper Defaults',
  espn: 'ESPN Defaults',
  yahoo: 'Yahoo Defaults',
} as const

const TRADE_REVIEW_LABEL = {
  none: 'Instant (no review)',
  commissioner: 'Commissioner Review',
  league_vote: 'League Vote',
} as const

const PPR_LABEL = { standard: 'Standard', half: 'Half PPR', full: 'Full PPR' } as const

function Badge({ children, accent }: { children: React.ReactNode; accent: AccentTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold ${accent.text}`}
    >
      {children}
    </span>
  )
}

function Row({
  label,
  value,
  accent: _accent,
}: {
  label: string
  value: React.ReactNode
  accent: AccentTone
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </div>
  )
}

function SectionCard({
  title,
  onEdit,
  children,
  accent,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
  accent: AccentTone
}) {
  return (
    <InnerPanel>
      <div className="mb-2 flex items-center justify-between">
        <h4 className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-semibold text-white/50 underline-offset-2 hover:text-white hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </InnerPanel>
  )
}

export interface Page4ReviewProps {
  state: CreateLeagueV2State
  accent: AccentTone
  onJump: (page: V2PageId) => void
}

export function Page4Review({ state, accent, onJump }: Page4ReviewProps) {
  const football = isFootballLike(state.sport)

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="mb-5">
          <h2 className="text-2xl font-black tracking-tight text-white">League Setup Summary</h2>
          <p className="mt-1 text-sm text-white/55">
            Here&apos;s everything you&apos;ve picked. Tap <span className="text-white/80">Edit</span> on any
            section to jump back.
          </p>
        </div>

        <div className="space-y-3">
          {/* Overview */}
          <SectionCard title="League Overview" accent={accent} onEdit={() => onJump('setup')}>
            <Row
              label="Name"
              accent={accent}
              value={state.name.trim() || <span className="text-white/30">— unnamed —</span>}
            />
            <Row
              label="Format"
              accent={accent}
              value={<Badge accent={accent}>{LEAGUE_TYPE_LABEL[state.leagueType] ?? state.leagueType}</Badge>}
            />
            <Row label="Sport" accent={accent} value={state.sport} />
            <Row label="Teams" accent={accent} value={state.teamCount} />
            {state.leagueType === 'survivor' ? (
              <Row label="Starting Tribes" accent={accent} value={state.survivorTribeCount} />
            ) : null}
          </SectionCard>

          {/* Rules */}
          <SectionCard title="Rules & Draft" accent={accent} onEdit={() => onJump('setup')}>
            <Row
              label="Draft Type"
              accent={accent}
              value={<Badge accent={accent}>{DRAFT_TYPE_LABEL[state.draftType] ?? state.draftType}</Badge>}
            />
            {state.draftType === 'snake' ? (
              <Row
                label="3RR"
                accent={accent}
                value={state.thirdRoundReversal ? 'Enabled' : 'Disabled'}
              />
            ) : null}
            <Row
              label="Trade Review"
              accent={accent}
              value={TRADE_REVIEW_LABEL[state.tradeReviewMode]}
            />
            <Row label="Timezone" accent={accent} value={state.timezone} />
            <Row label="Language" accent={accent} value={state.language.toUpperCase()} />
          </SectionCard>

          {/* Scoring */}
          <SectionCard title="Scoring" accent={accent} onEdit={() => onJump('scoring')}>
            <Row label="Source" accent={accent} value={SCORING_LABEL[state.scoringSource]} />
            {football ? (
              <>
                <Row label="Reception" accent={accent} value={PPR_LABEL[state.pprMode]} />
                <Row label="Superflex" accent={accent} value={state.superflex ? 'Yes' : 'No'} />
                <Row
                  label="TE Premium"
                  accent={accent}
                  value={
                    state.tePremium ? (
                      <Badge accent={accent}>×{state.tePremiumMultiplier}</Badge>
                    ) : (
                      'No'
                    )
                  }
                />
              </>
            ) : (
              <Row
                label="Preset"
                accent={accent}
                value={`${state.sport} defaults`}
              />
            )}
          </SectionCard>

          {state.description.trim() ? (
            <SectionCard title="Description" accent={accent} onEdit={() => onJump('identity')}>
              <p className="py-1 text-sm leading-relaxed text-white/80">{state.description.trim()}</p>
            </SectionCard>
          ) : null}
        </div>
      </GlassCard>
    </div>
  )
}
