'use client'

/**
 * Map league format/concept to a PNG from /public (fallback when no Sleeper avatar).
 */
const CONCEPT_ICONS: Record<string, string> = {
  dynasty: '/af-crest.png',
  keeper: '/af-robot-king.png',
  bestball: '/bracket-example-1.png',
  bracket: '/bracket-example-2.png',
  redraft: '/af-logo-bg.png',
  default: '/default-avatar.png',
}

export function LeagueTypeIcon({
  league,
  size = 32,
}: {
  league: { scoring?: string; isDynasty?: boolean; format?: string }
  size?: number
}) {
  const format = `${league.format || ''} ${league.scoring || ''}`.toLowerCase()

  let iconSrc = CONCEPT_ICONS.default
  if (league.isDynasty || format.includes('dynasty')) {
    iconSrc = CONCEPT_ICONS.dynasty
  } else if (format.includes('keeper')) {
    iconSrc = CONCEPT_ICONS.keeper
  } else if (format.includes('bestball') || format.includes('best_ball') || format.includes('best ball')) {
    iconSrc = CONCEPT_ICONS.bestball
  } else if (format.includes('bracket')) {
    iconSrc = CONCEPT_ICONS.bracket
  } else if (format.includes('redraft') || format.includes('standard')) {
    iconSrc = CONCEPT_ICONS.redraft
  }

  return (
    <img
      src={iconSrc}
      alt={format || 'league'}
      width={size}
      height={size}
      className="flex-shrink-0 rounded-[8px] object-cover"
      style={{ width: size, height: size }}
    />
  )
}
