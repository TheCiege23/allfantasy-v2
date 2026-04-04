import { notFound } from 'next/navigation'
import { DraftRoomHarnessClient } from './DraftRoomHarnessClient'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

export default async function E2EDraftRoomPage(props: {
  searchParams?:
    | Promise<{ leagueId?: string; sport?: string; variant?: string; commissioner?: string }>
    | { leagueId?: string; sport?: string; variant?: string; commissioner?: string }
}) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const sp = props.searchParams ?? {}
  const resolved =
    typeof (sp as Promise<{ leagueId?: string; sport?: string; variant?: string; commissioner?: string }>).then === 'function'
      ? await (sp as Promise<{ leagueId?: string; sport?: string; variant?: string; commissioner?: string }>)
      : (sp as { leagueId?: string; sport?: string; variant?: string; commissioner?: string })

  const leagueId = resolved.leagueId?.trim() || 'e2e-draft-room'
  const sport = normalizeToSupportedSport(resolved.sport) ?? DEFAULT_SPORT
  const variant = String(resolved.variant ?? '').toUpperCase()
  const formatType = variant === 'IDP' || variant === 'DYNASTY_IDP' ? 'IDP' : undefined
  const isCommissioner = String(resolved.commissioner ?? '1').toLowerCase() !== '0'

  return (
    <DraftRoomHarnessClient leagueId={leagueId} sport={sport} formatType={formatType} isCommissioner={isCommissioner} />
  )
}
