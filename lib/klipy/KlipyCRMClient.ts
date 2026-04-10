/**
 * Klipy CRM Client
 *
 * Integrates AllFantasy.AI with Klipy CRM for:
 * - Tracking user signups as contacts (People)
 * - Tracking league creation as interactions
 * - Tracking subscription upgrades as interactions
 * - Syncing commissioner profiles as contacts
 * - Logging support interactions
 * - Tracking engagement events
 *
 * Base URL: https://api.klipy.ai/api/v1
 * Auth: X-Klipy-Api-Key header
 * Rate limit: 200 req/min per key, 1000 req/min per org
 */

const KLIPY_BASE = 'https://api.klipy.ai/api/v1'

type KlipyResponse<T> = {
  object: 'success' | 'error'
  data: T
  meta: { request_id: string; api_version: string; timestamp: string }
}

type KlipyError = {
  object: 'error'
  error: { code: string; message: string }
}

type KlipyPerson = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  title: string | null
  phone: string | null
  companyId: string | null
  createdAt: string
  updatedAt: string
}

type KlipyCompany = {
  id: string
  domain: string
  name: string | null
  createdAt: string
}

type KlipyInteraction = {
  id: string
  type: string
  direction: string
  title: string
  summary: string | null
  interactionDate: string
  createdAt: string
}

function getApiKey(): string | null {
  return process.env.KLIPY_API_KEY ?? null
}

async function klipyFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T | null> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn('[klipy] KLIPY_API_KEY not configured — skipping CRM sync')
    return null
  }

  const res = await fetch(`${KLIPY_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'X-Klipy-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown')
    console.warn(`[klipy] API ${res.status} on ${path}:`, errBody)
    return null
  }

  const data = (await res.json()) as KlipyResponse<T>
  if (data.object === 'error') {
    console.warn(`[klipy] Error on ${path}:`, (data as unknown as KlipyError).error)
    return null
  }

  return data.data
}

// ============================================================================
// PEOPLE (Users / Commissioners)
// ============================================================================

/**
 * Sync a user signup to Klipy as a contact.
 * Called on user registration.
 */
export async function syncUserToKlipy(user: {
  email: string
  displayName: string | null
  username: string | null
}): Promise<string | null> {
  const names = (user.displayName ?? user.username ?? '').trim().split(' ')
  const firstName = names[0] ?? ''
  const lastName = names.slice(1).join(' ') || null

  const result = await klipyFetch<KlipyPerson>('/people', {
    method: 'PUT', // upsert
    body: {
      email: user.email,
      firstName,
      lastName,
      title: 'Fantasy Manager',
      remarks: `AllFantasy.AI user: ${user.username ?? user.email}`,
    },
  })

  return result?.id ?? null
}

/**
 * Update a user's CRM profile when they upgrade to commissioner.
 */
export async function syncCommissionerUpgrade(user: {
  email: string
  displayName: string | null
  leagueCount: number
  subscriptionTier: string | null
}): Promise<void> {
  await klipyFetch<KlipyPerson>('/people', {
    method: 'PUT',
    body: {
      email: user.email,
      firstName: user.displayName?.split(' ')[0] ?? '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || null,
      title: user.subscriptionTier
        ? `Commissioner (${user.subscriptionTier})`
        : `Commissioner (${user.leagueCount} leagues)`,
    },
  })
}

/**
 * Get a person by ID from Klipy.
 */
export async function getKlipyPerson(personId: string): Promise<KlipyPerson | null> {
  return klipyFetch<KlipyPerson>(`/people/${personId}`)
}

/**
 * Query people in Klipy by email.
 */
export async function queryKlipyPeople(filter: {
  email?: string
  companyId?: string
  limit?: number
}): Promise<KlipyPerson[]> {
  const result = await klipyFetch<KlipyPerson[]>('/people/query', {
    method: 'POST',
    body: { filter, limit: filter.limit ?? 20 },
  })
  return result ?? []
}

// ============================================================================
// COMPANIES (Leagues as "companies")
// ============================================================================

/**
 * Sync a league to Klipy as a company.
 * Leagues are tracked as "companies" for organizational purposes.
 */
export async function syncLeagueToKlipy(league: {
  id: string
  name: string
  sport: string
  teamCount: number
  leagueType: string
}): Promise<string | null> {
  const result = await klipyFetch<KlipyCompany>('/companies', {
    method: 'POST',
    body: {
      domain: `league-${league.id}.allfantasy.ai`,
      name: `${league.name} (${league.sport} ${league.leagueType} - ${league.teamCount} teams)`,
    },
  })
  return result?.id ?? null
}

// ============================================================================
// INTERACTIONS (Events / Activities)
// ============================================================================

/**
 * Log a user event as an interaction in Klipy.
 */
export async function logKlipyInteraction(interaction: {
  type: 'league_created' | 'subscription_upgraded' | 'draft_completed' | 'trade_completed' | 'support_request' | 'referral' | 'churn_risk'
  title: string
  summary: string
  userEmail: string
  direction?: 'inbound' | 'outbound'
}): Promise<string | null> {
  const result = await klipyFetch<KlipyInteraction>('/interactions', {
    method: 'POST',
    body: {
      type: 'note',
      direction: interaction.direction ?? 'inbound',
      title: `[${interaction.type.replace(/_/g, ' ').toUpperCase()}] ${interaction.title}`,
      summary: interaction.summary,
      mainContactEmail: interaction.userEmail,
      interactionDate: new Date().toISOString(),
    },
  })
  return result?.id ?? null
}

/**
 * Log a league creation event.
 */
export async function logLeagueCreation(
  userEmail: string,
  leagueName: string,
  sport: string,
  leagueType: string,
): Promise<void> {
  await logKlipyInteraction({
    type: 'league_created',
    title: `Created ${leagueName}`,
    summary: `User created a ${sport} ${leagueType} league: ${leagueName}`,
    userEmail,
  })
}

/**
 * Log a subscription upgrade event.
 */
export async function logSubscriptionUpgrade(
  userEmail: string,
  tier: string,
): Promise<void> {
  await logKlipyInteraction({
    type: 'subscription_upgraded',
    title: `Upgraded to ${tier}`,
    summary: `User upgraded their subscription to ${tier}`,
    userEmail,
  })
}

/**
 * Log a draft completion event.
 */
export async function logDraftCompletion(
  userEmail: string,
  leagueName: string,
  draftType: string,
): Promise<void> {
  await logKlipyInteraction({
    type: 'draft_completed',
    title: `Draft completed: ${leagueName}`,
    summary: `${draftType} draft completed for ${leagueName}`,
    userEmail,
  })
}

/**
 * Log a churn risk signal.
 */
export async function logChurnRisk(
  userEmail: string,
  reason: string,
): Promise<void> {
  await logKlipyInteraction({
    type: 'churn_risk',
    title: 'Churn risk detected',
    summary: reason,
    userEmail,
    direction: 'outbound',
  })
}

// ============================================================================
// AUTHENTICATION / HEALTH CHECK
// ============================================================================

/**
 * Validate the Klipy API key and get team info.
 */
export async function validateKlipyConnection(): Promise<{
  connected: boolean
  teamName: string | null
}> {
  const result = await klipyFetch<{ team: { name: string } }>('/authenticate')
  if (!result) return { connected: false, teamName: null }
  return { connected: true, teamName: result.team?.name ?? null }
}

/**
 * Check if Klipy integration is configured.
 */
export function isKlipyConfigured(): boolean {
  return Boolean(getApiKey())
}
