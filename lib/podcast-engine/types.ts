/**
 * AI Fantasy Podcast — episode and generation types.
 */

export interface PodcastScriptSection {
  heading: string
  body: string
}

export interface GeneratedPodcastScript {
  title: string
  script: string
  sections: PodcastScriptSection[]
}

export interface PodcastEpisodeRecord {
  id: string
  userId: string
  title: string
  script: string
  audioUrl: string | null
  durationSeconds: number | null
  createdAt: Date
}
