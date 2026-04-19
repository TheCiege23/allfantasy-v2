import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import type { InjurySeverityBucket } from './types'

/**
 * Sport/position-aware replacement guidance using only structural logic (no invented players or timelines).
 */
export function buildReplacementHint(args: {
  sport: string
  position: string
  severity: InjurySeverityBucket
  isStarter: boolean
}): string {
  const sp = normalizeToSupportedSport(args.sport) as SupportedSport
  const pos = (args.position || '—').toUpperCase()
  const sev = args.severity
  const starter = args.isStarter

  if (sev === 'probable' || sev === 'other') {
    return 'Likely active — still confirm inactive report and league scoring for start/sit.'
  }

  const urgent = sev === 'out' || sev === 'ir' || sev === 'suspended'

  if (sp === 'NFL' || sp === 'NCAAF') {
    if (['RB', 'WR', 'TE'].includes(pos) || pos === 'FLEX') {
      return urgent
        ? starter
          ? 'Priority: same-slot or FA/stream fill — check snap share and weather; consider handcuff if already rostered.'
          : 'Depth stash or stream by matchup from available free agents.'
        : 'Monitor designation — queue backup flex option before lock.'
    }
    if (pos === 'QB') {
      return urgent
        ? 'QB vacancy: stream replacement from wire; superflex leagues prioritize QB2 fill.'
        : 'QB uncertainty: roster a second QB if roster rules allow.'
    }
    if (pos === 'K' || pos === 'DST' || pos === 'DEF') {
      return urgent ? 'Replace with streaming K/DST from wire — low roster hold cost.' : 'Streaming position — confirm inactive before lock.'
    }
    return urgent ? 'Fill from bench or wire by positional need — verify league lineup slots.' : 'Track practice report before committing lineup.'
  }

  if (sp === 'NBA' || sp === 'NCAAB') {
    if (['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C', 'UTIL'].includes(pos) || pos.includes('F') || pos.includes('G')) {
      return urgent
        ? starter
          ? 'Back-to-back and minutes risk — stream from wire with games remaining; check IL/IR slots.'
          : 'Bench coverage or stream for schedule density.'
        : 'Game-time decision risk — leave UTIL/flex flexibility.'
    }
    return 'Monitor minutes and rest reports — confirm before lineup lock.'
  }

  if (sp === 'MLB') {
    if (['SP', 'RP', 'P'].includes(pos)) {
      return urgent ? 'Pitching: replace with next starter or ratio RP from bench/wire — verify probable pitchers.' : 'Probable starter changes — check lineup card.'
    }
    return 'Batting: stream platoon or fill UTIL — verify lineup vs handedness.'
  }

  if (sp === 'NHL') {
    if (pos === 'G') {
      return urgent ? 'Goalie: start backup or stream from wire — confirm starter skate.' : 'G tandem risk — track morning skate.'
    }
    return 'Skates: line shuffle risk — confirm top-line deployment.'
  }

  if (sp === 'SOCCER') {
    return urgent ? 'Rotation risk — check XI and minutes limit before deadline.' : 'Fixture congestion — monitor press conference.'
  }

  return urgent ? 'Fill from bench or free-agent pool by position — confirm league roster rules.' : 'Monitor official status before lock.'
}
