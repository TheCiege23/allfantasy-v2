import 'server-only'

export type SleeperUserProfile = {
  user_id: string
  username?: string
  display_name?: string
  avatar?: string | null
}

type SleeperLookupResult =
  | { status: 'found'; user: SleeperUserProfile }
  | { status: 'not_found' }
  | { status: 'unavailable'; code: 'timeout' | 'rate_limited' | 'upstream_error' }

type SleeperUnavailableCode = Extract<
  SleeperLookupResult,
  { status: 'unavailable' }
>['code']

const SLEEPER_LOOKUP_TIMEOUT_MS = 8000
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function normalizeSleeperUsernameInput(username: string): string {
  return username.trim().replace(/^@+/, '')
}

async function fetchSleeperUserCandidate(candidate: string): Promise<SleeperLookupResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SLEEPER_LOOKUP_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/user/${encodeURIComponent(candidate)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    )

    if (response.status === 404) {
      return { status: 'not_found' }
    }

    if (RETRYABLE_STATUS_CODES.has(response.status)) {
      return {
        status: 'unavailable',
        code: response.status === 429 ? 'rate_limited' : 'upstream_error',
      }
    }

    if (!response.ok) {
      return { status: 'unavailable', code: 'upstream_error' }
    }

    const data = (await response.json()) as SleeperUserProfile | null
    if (!data?.user_id) {
      return { status: 'not_found' }
    }

    return { status: 'found', user: data }
  } catch (error) {
    if ((error as { name?: string } | null)?.name === 'AbortError') {
      return { status: 'unavailable', code: 'timeout' }
    }
    return { status: 'unavailable', code: 'upstream_error' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function lookupSleeperUser(username: string): Promise<SleeperLookupResult> {
  const normalized = normalizeSleeperUsernameInput(username)
  if (!normalized) return { status: 'not_found' }

  const candidates = Array.from(
    new Set([normalized, normalized.toLowerCase()].filter(Boolean))
  )

  let sawUnavailable = false
  let lastUnavailableCode: SleeperUnavailableCode = 'upstream_error'

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await fetchSleeperUserCandidate(candidate)

      if (result.status === 'found') {
        return result
      }

      if (result.status === 'not_found') {
        break
      }

      sawUnavailable = true
      lastUnavailableCode = result.code
      if (attempt < 2) {
        await delay(250 * (attempt + 1))
      }
    }
  }

  if (sawUnavailable) {
    return { status: 'unavailable', code: lastUnavailableCode }
  }

  return { status: 'not_found' }
}
