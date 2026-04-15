import type { DraftFormatKind } from './types'

/** Resolves who picks next given format (handles traded picks via pre-built order). */
export function resolveNextPickOrder(format: DraftFormatKind, upcomingTeamIds: string[]): string[] {
  if (!upcomingTeamIds.length) return []
  switch (format) {
    case 'SNAKE':
    case 'LINEAR':
    case 'KEEPER':
    case 'DYNASTY_STARTUP':
    case 'ROOKIE':
    case 'SUPPLEMENTAL':
    case 'DISPERSAL':
    case 'DEVY':
    case 'C2C':
    case 'IDP':
    case 'BEST_BALL':
    case 'TOURNAMENT':
    case 'GUILLOTINE':
    case 'CUSTOM':
      return [...upcomingTeamIds]
    case 'AUCTION':
    case 'SALARY_CAP':
      return [...upcomingTeamIds]
    default:
      return [...upcomingTeamIds]
  }
}
