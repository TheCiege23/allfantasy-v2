import type { LeagueSport } from '@prisma/client'

export type DashboardChecklistState = {
  step1: boolean
  step2: boolean
  step3: boolean
  step4: boolean
  step5: boolean
}

export type DashboardFavoriteSportsPayload = {
  supported: LeagueSport[]
  custom: string[]
}

/** Persisted in `UserProfile.dashboardOnboarding` */
export type DashboardOnboardingJson = {
  checklist?: Partial<DashboardChecklistState>
  favoriteSports?: DashboardFavoriteSportsPayload
}

export const DEFAULT_CHECKLIST: DashboardChecklistState = {
  step1: false,
  step2: false,
  step3: false,
  step4: false,
  step5: false,
}
