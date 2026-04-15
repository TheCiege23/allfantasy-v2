import { ChimmyChatPageClient } from './ChimmyChatPageClient'

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v
}

export default async function ChimmyChatPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = searchParams ? await searchParams : {}

  return (
    <ChimmyChatPageClient
      prompt={firstParam(sp.prompt)}
      leagueId={firstParam(sp.leagueId)}
      sport={firstParam(sp.sport)}
      teamId={firstParam(sp.teamId)}
      week={firstParam(sp.week)}
      strategyMode={firstParam(sp.strategyMode)}
    />
  )
}
