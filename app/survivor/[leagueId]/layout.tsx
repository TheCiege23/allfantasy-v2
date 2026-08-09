import type { ReactNode } from 'react'
import { SurvivorAppShell } from './SurvivorAppShell'

export default function SurvivorLeagueLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { leagueId: string }
}) {
  return <SurvivorAppShell leagueId={params.leagueId}>{children}</SurvivorAppShell>
}
