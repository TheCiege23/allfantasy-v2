"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

type FeedType = "player" | "team"

export default function FantasyNewsHarnessClient() {
  const [feedType, setFeedType] = useState<FeedType>("player")
  const [query, setQuery] = useState("")
  const [aiSummary, setAiSummary] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const articleUrl = useMemo(
    () => (feedType === "player" ? "about:blank#player-article" : "about:blank#team-article"),
    [feedType]
  )

  return (
    <div className="min-h-screen bg-[#040915] p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Fantasy News Aggregator Harness</h1>
        <p className="text-sm text-white/70">
          Deterministic harness for player/team feed loading, card clicks, source links, and AI summarized headlines.
        </p>
        <p className="text-xs text-white/50" data-testid="fantasy-news-hydrated-flag">
          {hydrated ? "hydrated" : "hydrating"}
        </p>
        <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setFeedType("player")}
              data-testid="fantasy-news-feed-type-player"
            >
              Player news feed
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeedType("team")}
              data-testid="fantasy-news-feed-type-team"
            >
              Team news feed
            </Button>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={feedType === "player" ? "e.g. Josh Allen" : "e.g. KC"}
            className="w-full rounded border border-white/20 bg-black/30 px-3 py-2"
            data-testid="fantasy-news-query-input"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={aiSummary}
              onChange={(e) => setAiSummary(e.target.checked)}
              data-testid="fantasy-news-summarize-toggle"
            />
            AI summarized headlines
          </label>
          <Button type="button" onClick={() => setLoaded(true)} data-testid="fantasy-news-load-button">
            {feedType === "player" ? "Load player news" : "Load team news"}
          </Button>
        </div>

        {loaded && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-audit="news-card"
              data-testid="fantasy-news-card-news-1"
              className="block rounded border border-white/10 p-3 hover:bg-white/5"
            >
              <h2 className="font-semibold">
                {aiSummary ? "AI summary: Startable volume spike expected" : "Starter volume is trending up"}
              </h2>
              <p className="text-sm text-white/70">{query || (feedType === "player" ? "Josh Allen" : "KC")} update.</p>
            </a>
            <a
              href={articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-audit="source-link"
              data-testid="fantasy-news-source-link-news-1"
              className="mt-2 inline-flex text-sm text-cyan-300 hover:underline"
            >
              Source link
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
