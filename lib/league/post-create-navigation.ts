/**
 * Canonical “first URL” after a successful league/tournament create.
 * Keeps `/create-league` submit, My Leagues entry, and list routing aligned.
 */

export type PostCreateLeagueHomeArgs = {
  /** New `League.id` from `/api/league/create`. Omit only when navigating purely by `tournamentId`. */
  leagueId?: string
  /** Wizard `leagueType` / format id (e.g. `tournament`, `survivor`, `redraft`). */
  leagueType: string
  /** From `/api/tournament/create` when `leagueType === 'tournament'`. */
  tournamentId?: string | null
  /** Mirrors wizard invite step — adds `showInvite=1` for standard league home. */
  allowInviteLink?: boolean
  /** Zombie universe tier from create wizard — multi-league packs go to commissioner tools. */
  zombieUniverseTier?: 'single_gamma' | 'beta_trio' | 'alpha_hex' | null
}

/**
 * Build post-submit navigation URL: tournament hub → `/tournament/...`, survivor → `/survivor/...`,
 * all other formats → `/league/...` with `created` + `openChat` query flags.
 */
export function buildPostCreateLeagueHomeHref(args: PostCreateLeagueHomeArgs): string {
  const lt = String(args.leagueType ?? '').trim().toLowerCase()
  const tid = typeof args.tournamentId === 'string' ? args.tournamentId.trim() : ''

  if (lt === 'tournament' && tid) {
    return `/app/tournament/${tid}/commissioner?created=1`
  }

  const leagueId = typeof args.leagueId === 'string' ? args.leagueId.trim() : ''
  if (!leagueId) {
    return '/dashboard'
  }

  if (lt === 'survivor') {
    return `/survivor/${leagueId}/commissioner?created=1`
  }

  if (lt === 'zombie') {
    const tier = args.zombieUniverseTier ?? 'single_gamma'
    if (tier === 'beta_trio' || tier === 'alpha_hex') {
      return `/zombie/${leagueId}/settings?created=1`
    }
    const q = new URLSearchParams()
    q.set('created', '1')
    q.set('guide', 'settings')
    q.set('openChat', 'league')
    if (args.allowInviteLink) q.set('showInvite', '1')
    return `/league/${leagueId}?${q.toString()}`
  }

  if (lt === 'big_brother') {
    return `/big-brother/${leagueId}/command?created=1`
  }

  const q = new URLSearchParams()
  q.set('created', '1')
  q.set('guide', 'settings')
  q.set('openChat', 'league')
  if (args.allowInviteLink) q.set('showInvite', '1')
  return `/league/${leagueId}?${q.toString()}`
}
