"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getAchievementSharePayload } from "@/lib/social-sharing/SocialShareService"
import type { AchievementShareContext, AchievementShareType } from "@/lib/social-sharing/types"

const SHARE_TYPES: AchievementShareType[] = [
  "winning_matchup",
  "winning_league",
  "high_scoring_team",
]

const SHARE_CONTEXTS: Record<AchievementShareType, AchievementShareContext> = {
  winning_matchup: {
    leagueName: "Viral League",
    teamName: "Alpha Squad",
    opponentName: "Beta Squad",
    week: 9,
    score: 142.8,
  },
  winning_league: {
    leagueName: "Viral League",
    teamName: "Alpha Squad",
  },
  high_scoring_team: {
    leagueName: "Viral League",
    teamName: "Alpha Squad",
    week: 9,
    score: 172.4,
  },
}

const TYPE_LABELS: Record<AchievementShareType, string> = {
  winning_matchup: "Winning a matchup",
  winning_league: "Winning a league",
  high_scoring_team: "High scoring team",
}

export default function ViralSocialSharingHarnessClient() {
  const [selectedType, setSelectedType] = useState<AchievementShareType>("winning_matchup")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const payload = useMemo(
    () => getAchievementSharePayload(selectedType, SHARE_CONTEXTS[selectedType]),
    [selectedType]
  )

  const onShare = useCallback(async () => {
    if (navigator.share && navigator.canShare?.({ title: payload.title, url: payload.shareUrl })) {
      await navigator.share({ title: payload.title, url: payload.shareUrl, text: payload.text })
      return
    }
    window.open(payload.twitterUrl, "_blank", "noopener,noreferrer")
  }, [payload])

  const onCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(payload.shareUrl)
  }, [payload.shareUrl])

  return (
    <div className="min-h-screen bg-[#040915] p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">Viral Social Sharing Harness</h1>
        <p className="text-sm text-white/70">
          Deterministic harness for share buttons and copy link buttons across social networks.
        </p>
        <p className="text-xs text-white/50" data-testid="viral-social-sharing-hydrated-flag">
          {hydrated ? "hydrated" : "hydrating"}
        </p>

        <div className="flex flex-wrap gap-2">
          {SHARE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                selectedType === type
                  ? "border-cyan-400/70 bg-cyan-400/20 text-cyan-200"
                  : "border-white/15 bg-black/20 text-white/70 hover:bg-white/10"
              }`}
              data-testid={`viral-share-type-${type}`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{payload.title}</p>
          <p className="mt-2 text-xs text-white/70">{payload.text}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onShare()}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              data-audit="share-button"
              data-testid="viral-share-button"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => window.open(payload.twitterUrl, "_blank", "noopener,noreferrer")}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              data-audit="share-button"
              data-testid="viral-share-button-x"
            >
              Post to X
            </button>
            <button
              type="button"
              onClick={() => window.open(payload.facebookUrl, "_blank", "noopener,noreferrer")}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              data-audit="share-button"
              data-testid="viral-share-button-facebook"
            >
              Share on Facebook
            </button>
            <button
              type="button"
              onClick={() => window.open(payload.redditUrl, "_blank", "noopener,noreferrer")}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              data-audit="share-button"
              data-testid="viral-share-button-reddit"
            >
              Share on Reddit
            </button>
            <button
              type="button"
              onClick={() => void onCopyLink()}
              className="rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              data-audit="copy-link-button"
              data-testid="viral-copy-link-button"
            >
              Copy link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
