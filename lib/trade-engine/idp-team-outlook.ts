/**
 * IDP team outlook: offensive strength, defensive strength, scarcity risk, waiver vulnerability.
 * Use when league has idpEnabled to enrich team/portfolio analysis.
 */

import type { Asset, LeagueSettings } from './types'
import { isIdpPos } from './league-intelligence'
import { computeLeagueIdpScarcity } from './idpTuning'

export interface IdpTeamOutlook {
  offensiveStrength: 'elite' | 'strong' | 'average' | 'weak'
  defensiveStrength: 'elite' | 'strong' | 'average' | 'weak'
  idpNeeds: string[]
  idpSurplus: string[]
  positionScarcityRisk: string[]
  waiverVulnerability: 'low' | 'medium' | 'high'
}

const OFFENSE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K'])
const IDP_POSITIONS = new Set(['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'])

function sumValue(assets: Asset[], pred: (a: Asset) => boolean): number {
  return assets.filter(pred).reduce((s, a) => s + (a.value ?? 0), 0)
}

/**
 * Compute a brief IDP-aware team outlook when settings.idpEnabled.
 */
export function getIdpTeamOutlook(
  assets: Asset[],
  settings: LeagueSettings
): IdpTeamOutlook | null {
  const idpEnabled = Boolean(settings.idpEnabled)
  if (!idpEnabled) return null

  const offenseValue = sumValue(assets, (a) => Boolean(a.type === 'PLAYER' && a.pos && OFFENSE_POSITIONS.has(a.pos.toUpperCase())))
  const idpValue = sumValue(assets, (a) => Boolean(a.type === 'PLAYER' && a.pos && isIdpPos(a.pos)))
  const idpCount = assets.filter((a) => a.type === 'PLAYER' && Boolean(a.pos) && IDP_POSITIONS.has((a.pos || '').toUpperCase())).length
  const starterSlots = Number(settings.starterSlots ?? 22)
  const idpSlots = Number(settings.idpStarterSlots ?? 0)

  const offensiveStrength: IdpTeamOutlook['offensiveStrength'] =
    offenseValue >= 40000 ? 'elite' : offenseValue >= 25000 ? 'strong' : offenseValue >= 12000 ? 'average' : 'weak'
  const defensiveStrength: IdpTeamOutlook['defensiveStrength'] =
    idpValue >= 15000 ? 'elite' : idpValue >= 8000 ? 'strong' : idpValue >= 3000 ? 'average' : 'weak'

  const scarcityList = computeLeagueIdpScarcity(settings.rosterPositions, settings.numTeams ?? 12)
  const positionScarcityRisk: string[] = []
  for (const s of scarcityList) {
    const atPos = assets.filter((a) => a.type === 'PLAYER' && (a.pos ?? '').toUpperCase() === s.position).length
    if (atPos < s.startersRequired && s.scarcityIndex > 1.2) {
      positionScarcityRisk.push(`${s.position} (scarce)`)
    }
  }

  const waiverVulnerability: IdpTeamOutlook['waiverVulnerability'] =
    idpSlots > 0 && idpCount < idpSlots ? 'high' : idpCount <= idpSlots + 2 ? 'medium' : 'low'

  const idpNeeds: string[] = positionScarcityRisk.length > 0 ? positionScarcityRisk : (idpCount < idpSlots ? ['IDP depth'] : [])
  const idpSurplus: string[] = idpCount > idpSlots + 4 ? ['IDP depth'] : []

  return {
    offensiveStrength,
    defensiveStrength,
    idpNeeds,
    idpSurplus,
    positionScarcityRisk,
    waiverVulnerability,
  }
}
