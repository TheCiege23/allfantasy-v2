'use client'

import { useEffect, useState } from 'react'

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening'

function periodForHour(hour: number): GreetingPeriod {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/**
 * Time-of-day greeting period, resolved only after mount. Deliberately starts
 * `null` (not a server-guessed default) rather than computing `new Date()`
 * during SSR — that class of mismatch is exactly what caused the hydration
 * bug fixed in PR #129, so this sidesteps it instead of suppressing it.
 */
export function useGreetingPeriod(): GreetingPeriod | null {
  const [period, setPeriod] = useState<GreetingPeriod | null>(null)

  useEffect(() => {
    setPeriod(periodForHour(new Date().getHours()))
  }, [])

  return period
}
