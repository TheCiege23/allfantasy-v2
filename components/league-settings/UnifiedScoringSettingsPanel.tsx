'use client'

/**
 * components/league-settings/UnifiedScoringSettingsPanel.tsx
 *
 * Sport-dispatcher component for the commissioner scoring settings UI.
 *
 * Takes a `sport` string and renders the correct sport-specific scoring panel.
 * Falls back to a graceful message for unrecognised sports.
 *
 * Usage:
 *   <UnifiedScoringSettingsPanel
 *     sport={league.sport}
 *     leagueId={league.id}
 *     isCommissioner={isCommissioner}
 *   />
 */

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Lazy-load each panel so only the needed sport's code is shipped per route
// ---------------------------------------------------------------------------

const NflScoringSettingsPanel = dynamic(
  () =>
    import('./NflScoringSettingsPanel').then((m) => ({
      default: m.NflScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

const NbaScoringSettingsPanel = dynamic(
  () =>
    import('./NbaScoringSettingsPanel').then((m) => ({
      default: m.NbaScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

const NcaabScoringSettingsPanel = dynamic(
  () =>
    import('./NcaabScoringSettingsPanel').then((m) => ({
      default: m.NcaabScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

const MlbScoringSettingsPanel = dynamic(
  () =>
    import('./MlbScoringSettingsPanel').then((m) => ({
      default: m.MlbScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

const NhlScoringSettingsPanel = dynamic(
  () =>
    import('./NhlScoringSettingsPanel').then((m) => ({
      default: m.NhlScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

const NcaafScoringSettingsPanel = dynamic(
  () =>
    import('./NcaafScoringSettingsPanel').then((m) => ({
      default: m.NcaafScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

const SoccerScoringSettingsPanel = dynamic(
  () =>
    import('./SoccerScoringSettingsPanel').then((m) => ({
      default: m.SoccerScoringSettingsPanel,
    })),
  { loading: () => <PanelLoader />, ssr: false },
)

// ---------------------------------------------------------------------------
// Tiny shared loading indicator
// ---------------------------------------------------------------------------

function PanelLoader() {
  return (
    <div className="flex items-center justify-center py-10 text-white/30">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props & component
// ---------------------------------------------------------------------------

interface Props {
  /** LeagueSport enum value from Prisma — e.g. 'NFL', 'NBA', 'SOCCER' */
  sport: string
  leagueId: string
  /** true = commissioner can edit; false = read-only */
  isCommissioner?: boolean
}

/**
 * UnifiedScoringSettingsPanel — renders the correct sport-specific scoring panel.
 *
 * Supports: NFL · NCAAF · NBA · NCAAB · MLB · NHL · SOCCER
 */
export function UnifiedScoringSettingsPanel({
  sport,
  leagueId,
  isCommissioner = false,
}: Props) {
  const common = { leagueId, isCommissioner }

  switch (sport?.toUpperCase()) {
    case 'NFL':
      return <NflScoringSettingsPanel {...common} />
    case 'NCAAF':
      return <NcaafScoringSettingsPanel {...common} />
    case 'NBA':
      return <NbaScoringSettingsPanel {...common} />
    case 'NCAAB':
      return <NcaabScoringSettingsPanel {...common} />
    case 'MLB':
      return <MlbScoringSettingsPanel {...common} />
    case 'NHL':
      return <NhlScoringSettingsPanel {...common} />
    case 'SOCCER':
      return <SoccerScoringSettingsPanel {...common} />
    default:
      return (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/40">
          Scoring settings are not yet available for{' '}
          <span className="font-medium text-white/60">{sport}</span>.
        </div>
      )
  }
}

export default UnifiedScoringSettingsPanel
