import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getDashboardOnboardingState,
  saveDashboardOnboardingState,
} from '@/lib/dashboard/DashboardOnboardingService'
import type { DashboardChecklistState, DashboardFavoriteSportsPayload } from '@/lib/dashboard/dashboard-onboarding-types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state = await getDashboardOnboardingState(userId)
    return NextResponse.json(state)
  } catch (e) {
    console.error('[dashboard-onboarding GET]', e)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

type PatchBody = {
  checklist?: Partial<DashboardChecklistState>
  favoriteSports?: DashboardFavoriteSportsPayload
}

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.checklist && !body.favoriteSports) {
    return NextResponse.json({ error: 'No updates' }, { status: 400 })
  }

  const result = await saveDashboardOnboardingState(userId, {
    checklist: body.checklist,
    favoriteSports: body.favoriteSports,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const state = await getDashboardOnboardingState(userId)
  return NextResponse.json(state)
}
