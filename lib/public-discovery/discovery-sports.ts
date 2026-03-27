import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export function getDiscoverySports(): { value: string; label: string }[] {
  return SUPPORTED_SPORTS.map((sport) => ({ value: sport, label: sport }))
}
