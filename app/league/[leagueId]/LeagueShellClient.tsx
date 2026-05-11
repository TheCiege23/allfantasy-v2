'use client'

import dynamic from 'next/dynamic'
import type { LeagueShellProps } from './LeagueShell'

/**
 * Client-boundary wrapper for the LeagueShell.
 * Keeps `next/dynamic` with `ssr: false` inside a Client Component so the
 * Server Component (page.tsx) does not hold the dynamic-import call.
 */
const LeagueShellDynamic = dynamic(
  () => import('./LeagueShell').then((mod) => mod.LeagueShell),
  {
    ssr: false,
    loading: () => null,
  },
)

export function LeagueShellClient(props: LeagueShellProps) {
  return <LeagueShellDynamic {...props} />
}
