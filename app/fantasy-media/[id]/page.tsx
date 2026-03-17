import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getEpisode } from "@/lib/fantasy-media/FantasyMediaQueryService"
import { resolvePlaybackUrl } from "@/lib/fantasy-media/MediaPlaybackResolver"
import FantasyMediaPlayerClient from "./FantasyMediaPlayerClient"

export const dynamic = "force-dynamic"

export default async function FantasyMediaEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) redirect(`/login?callbackUrl=/fantasy-media/${(await params).id}`)

  const { id } = await params
  const episode = await getEpisode(id, session.user.id)
  if (!episode) notFound()

  const playbackUrl = resolvePlaybackUrl(episode)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <FantasyMediaPlayerClient
          episodeId={episode.id}
          title={episode.title}
          script={episode.script}
          status={episode.status}
          playbackUrl={playbackUrl}
        />
      </div>
    </div>
  )
}
