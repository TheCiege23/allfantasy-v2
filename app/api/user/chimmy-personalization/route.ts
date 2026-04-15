import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import {
  resolveChimmyPersonalizationProfile,
  updateChimmyPersonalizationSettings,
} from '@/lib/chimmy-personalization'

export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  explanationStyle: z
    .enum(['concise', 'balanced', 'detailed', 'data-heavy', 'beginner-friendly', 'commissioner-focused'])
    .optional(),
  riskPreference: z.enum(['floor', 'balanced', 'upside']).optional(),
  leagueStylePreference: z
    .enum(['redraft-first', 'dynasty-first', 'specialty-league-first', 'c2c-devy-heavy'])
    .optional(),
  actionPreference: z.enum(['quick-one-move', 'top-3-options', 'full-breakdown']).optional(),
  alertPreference: z.enum(['minimal-alerts', 'balanced-alerts', 'aggressive-proactive-alerts']).optional(),
  storyContentPreferences: z
    .array(
      z.enum([
        'likes-recaps',
        'likes-power-rankings',
        'likes-humor',
        'likes-serious-analysis',
        'no-story-content',
      ]),
    )
    .optional(),
})

export async function GET() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await resolveChimmyPersonalizationProfile(user.appUserId)
  return NextResponse.json({ ok: true, profile })
}

export async function PATCH(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const next = await updateChimmyPersonalizationSettings(user.appUserId, parsed.data)
  const profile = await resolveChimmyPersonalizationProfile(user.appUserId)
  return NextResponse.json({ ok: true, explicit: next, profile })
}
