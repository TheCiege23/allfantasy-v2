import { notFound } from 'next/navigation'
import { DraftRoomPageClient } from '@/components/app/draft-room/DraftRoomPageClient'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

export default async function E2EDraftRoomPage(props: {
  searchParams?:
    | Promise<{ leagueId?: string; sport?: string; variant?: string }>
    | { leagueId?: string; sport?: string; variant?: string }
}) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const sp = props.searchParams ?? {}
  const resolved =
    typeof (sp as Promise<{ leagueId?: string; sport?: string; variant?: string }>).then === 'function'
      ? await (sp as Promise<{ leagueId?: string; sport?: string; variant?: string }>)
      : (sp as { leagueId?: string; sport?: string; variant?: string })

  const leagueId = resolved.leagueId?.trim() || 'e2e-draft-room'
  const sport = normalizeToSupportedSport(resolved.sport) ?? DEFAULT_SPORT
  const variant = String(resolved.variant ?? '').toUpperCase()
  const formatType = variant === 'IDP' || variant === 'DYNASTY_IDP' ? 'IDP' : undefined

  return (
    <div className="min-h-screen">
      <DraftRoomPageClient
        leagueId={leagueId}
        leagueName="E2E Draft Room"
        sport={sport}
        isDynasty={false}
        isCommissioner={true}
        formatType={formatType}
      />
    </div>
  )
}
