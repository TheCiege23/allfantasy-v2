import type { LeagueSport } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS, isSupportedSport } from '@/lib/sport-scope'
import type {
  DashboardChecklistState,
  DashboardFavoriteSportsPayload,
  DashboardOnboardingJson,
} from './dashboard-onboarding-types'
import { DEFAULT_CHECKLIST } from './dashboard-onboarding-types'

function parseJson(raw: unknown): DashboardOnboardingJson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as DashboardOnboardingJson
}

function normalizeFavoriteSports(input: unknown): DashboardFavoriteSportsPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { supported: [], custom: [] }
  }
  const o = input as { supported?: unknown; custom?: unknown }
  const supported = Array.isArray(o.supported)
    ? o.supported.filter((s): s is LeagueSport => typeof s === 'string' && isSupportedSport(s))
    : []
  const custom = Array.isArray(o.custom)
    ? o.custom
        .filter((c): c is string => typeof c === 'string')
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 48)
        .slice(0, 24)
    : []
  return { supported, custom }
}

function mergeChecklist(base: DashboardChecklistState, patch?: Partial<DashboardChecklistState>): DashboardChecklistState {
  return {
    step1: patch?.step1 ?? base.step1,
    step2: patch?.step2 ?? base.step2,
    step3: patch?.step3 ?? base.step3,
    step4: patch?.step4 ?? base.step4,
    step5: patch?.step5 ?? base.step5,
  }
}

export async function getDashboardOnboardingState(userId: string): Promise<{
  checklist: DashboardChecklistState
  favoriteSports: DashboardFavoriteSportsPayload
}> {
  const row = await prisma.userProfile.findUnique({
    where: { userId },
    select: { dashboardOnboarding: true, preferredSports: true },
  })
  const parsed = parseJson(row?.dashboardOnboarding)
  let checklist = mergeChecklist(DEFAULT_CHECKLIST, parsed.checklist)
  let favoriteSports = normalizeFavoriteSports(parsed.favoriteSports)

  // Backfill checklist from legacy local-only users: if preferredSports set but no dashboard JSON
  if (
    row?.preferredSports &&
    Array.isArray(row.preferredSports) &&
    row.preferredSports.length > 0 &&
    !parsed.checklist?.step1
  ) {
    checklist = { ...checklist, step1: true }
  }

  // Merge favorite sports from preferredSports string[] when custom JSON empty
  if (favoriteSports.supported.length === 0 && favoriteSports.custom.length === 0 && row?.preferredSports) {
    const arr = Array.isArray(row.preferredSports) ? row.preferredSports : []
    const supported = arr
      .map((s) => String(s).toUpperCase())
      .filter((s): s is LeagueSport => (SUPPORTED_SPORTS as readonly string[]).includes(s))
    if (supported.length > 0) {
      favoriteSports = { supported, custom: [] }
    }
  }

  return { checklist, favoriteSports }
}

export async function saveDashboardOnboardingState(
  userId: string,
  patch: {
    checklist?: Partial<DashboardChecklistState>
    favoriteSports?: DashboardFavoriteSportsPayload
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await getDashboardOnboardingState(userId)
  const nextChecklist = patch.checklist ? mergeChecklist(current.checklist, patch.checklist) : current.checklist
  const nextFavorites = patch.favoriteSports
    ? normalizeFavoriteSports(patch.favoriteSports)
    : current.favoriteSports

  const payload: DashboardOnboardingJson = {
    checklist: nextChecklist,
    favoriteSports: nextFavorites,
  }

  const preferredSportsUpdate: LeagueSport[] | null =
    nextFavorites.supported.length > 0 ? nextFavorites.supported : null

  const preferredSportsJson: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
    preferredSportsUpdate === null
      ? Prisma.DbNull
      : (preferredSportsUpdate as unknown as Prisma.InputJsonValue)

  try {
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        dashboardOnboarding: payload as Prisma.InputJsonValue,
        preferredSports: preferredSportsJson,
      },
      update: {
        dashboardOnboarding: payload as Prisma.InputJsonValue,
        ...(patch.favoriteSports !== undefined ? { preferredSports: preferredSportsJson } : {}),
      },
    })
    return { ok: true }
  } catch (e) {
    console.error('[DashboardOnboardingService] save failed:', e)
    return { ok: false, error: 'Failed to save onboarding state' }
  }
}
