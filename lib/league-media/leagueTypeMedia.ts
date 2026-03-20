export type LeagueTypeMedia = {
  key: string
  label: string
  thumbnail: string
  selectionVideo: string
  introVideo: string
  thumbnailFallback: string
}

const FALLBACK_THUMBNAIL = '/af-crest.png'

const LEAGUE_TYPE_MEDIA_MAP: Record<string, Omit<LeagueTypeMedia, 'key'>> = {
  redraft: {
    label: 'Redraft',
    thumbnail: '/league-type-dynasty.png',
    selectionVideo: '/league-type-redraft-intro.mp4',
    introVideo: '/league-type-redraft-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  dynasty: {
    label: 'Dynasty',
    thumbnail: '/league-type-dynasty.png',
    selectionVideo: '/league-type-dynasty.mp4',
    introVideo: '/league-type-dynasty-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  keeper: {
    label: 'Keeper',
    thumbnail: '/league-type-keeper.png',
    selectionVideo: '/league-type-keeper.mp4',
    introVideo: '/league-type-keeper-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  best_ball: {
    label: 'Best Ball',
    thumbnail: '/league-type-best-ball.png',
    selectionVideo: '/league-type-best-ball.mp4',
    introVideo: '/league-type-best-ball-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  guillotine: {
    label: 'Guillotine',
    thumbnail: '/league-type-guillotine.png',
    selectionVideo: '/league-type-guillotine.mp4',
    introVideo: '/league-type-guillotine-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  survivor: {
    label: 'Survivor',
    thumbnail: '/league-type-survivor.png',
    selectionVideo: '/league-type-survivor.mp4',
    introVideo: '/league-type-survivor-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  tournament: {
    label: 'Tournament',
    thumbnail: '/league-type-tournament.png',
    selectionVideo: '/league-type-tournament.mp4',
    introVideo: '/league-type-tournament.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  devy: {
    label: 'Devy',
    thumbnail: '/league-type-devy.png',
    selectionVideo: '/league-type-devy.mp4',
    introVideo: '/league-type-devy-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  c2c: {
    label: 'Campus to Canton (C2C)',
    thumbnail: '/league-type-c2c.png',
    selectionVideo: '/league-type-c2c.mp4',
    introVideo: '/league-type-c2c-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  zombie: {
    label: 'Zombie',
    thumbnail: '/league-type-zombie.png',
    selectionVideo: '/league-type-zombie.mp4',
    introVideo: '/league-type-zombie-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  salary_cap: {
    label: 'Salary Cap',
    thumbnail: '/league-type-salary-cap.png',
    selectionVideo: '/league-type-salary-cap.mp4',
    introVideo: '/league-type-salary-cap-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  big_brother: {
    label: 'Big Brother',
    thumbnail: '/league-type-big-brother.png',
    selectionVideo: '/league-type-big-brother.mp4',
    introVideo: '/league-type-big-brother-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
  idp: {
    label: 'IDP',
    thumbnail: '/league-type-idp.png',
    selectionVideo: '/league-type-idp.mp4',
    introVideo: '/league-type-idp-intro.mp4',
    thumbnailFallback: FALLBACK_THUMBNAIL,
  },
}

const LEAGUE_TYPE_ALIASES: Record<string, string> = {
  bestball: 'best_ball',
  devy_dynasty: 'devy',
  merged_devy_c2c: 'c2c',
  dynasty_idp: 'idp',
}

export function normalizeLeagueTypeKey(raw?: string | null): string {
  const key = String(raw ?? '').trim().toLowerCase()
  if (!key) return 'redraft'
  return LEAGUE_TYPE_ALIASES[key] ?? key
}

export function getLeagueTypeMedia(raw?: string | null): LeagueTypeMedia {
  const key = normalizeLeagueTypeKey(raw)
  const media = LEAGUE_TYPE_MEDIA_MAP[key] ?? LEAGUE_TYPE_MEDIA_MAP.redraft
  return { key, ...media }
}
