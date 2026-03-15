/**
 * SportDashboardResolver — sport-aware labels, emoji, and display order for dashboard sections.
 * Supports NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.
 */
import {
  getSportLabel,
  getSportEmoji,
  getDashboardSportOrder as getOrder,
} from "@/lib/multi-sport/SportSelectorUIService"
import type { SportType } from "@/lib/multi-sport/sport-types"

export interface SportSectionInfo {
  sport: SportType
  label: string
  emoji: string
}

/** Display order for dashboard sport sections (aligned with sport-scope). */
export function getDashboardSportOrder(): SportType[] {
  return getOrder()
}

export function getSportSectionLabel(sport: string): string {
  return getSportLabel(sport)
}

export function getSportSectionEmoji(sport: string): string {
  return getSportEmoji(sport)
}

/** Resolve section info for a sport (label + emoji for section headers). */
export function getSportSectionInfo(sport: string): SportSectionInfo {
  return {
    sport: sport as SportType,
    label: getSportLabel(sport),
    emoji: getSportEmoji(sport),
  }
}
