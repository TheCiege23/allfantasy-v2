import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { getDraftAutomationMatrix } from '@/lib/draft-automation-policy'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getProviderStatus } from '@/lib/provider-config'

export const dynamic = 'force-dynamic'

function isFeatureEnabled(feature: string, uiSettings: Awaited<ReturnType<typeof getDraftUISettingsForLeague>>) {
  if (feature === 'explain_ai_queue_reorder_rationale') return Boolean(uiSettings.aiQueueReorderEnabled)
  if (feature === 'explain_best_pick') return true
  if (feature === 'explain_reach_vs_value') return true
  if (feature === 'explain_positional_need') return true
  if (feature === 'private_trade_review') return true
  if (feature === 'counter_trade_suggestion') return true
  if (feature === 'explain_draft_recap') return true
  if (feature === 'narrative_league_story_recap') return true
  if (feature === 'premium_coach_style_advice') return true
  return true
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [uiSettings, providerStatus] = await Promise.all([
    getDraftUISettingsForLeague(leagueId),
    Promise.resolve(getProviderStatus()),
  ])

  const matrix = getDraftAutomationMatrix().map((entry) => {
    const enabled = isFeatureEnabled(entry.feature, uiSettings)
    const aiAvailable = entry.aiOptional ? providerStatus.anyAi : false
    const state = !entry.aiOptional
      ? 'automated'
      : !enabled
        ? 'disabled'
        : !aiAvailable
          ? 'provider_unavailable'
          : 'available_on_demand'
    return {
      ...entry,
      enabled,
      aiAvailable,
      state,
    }
  })

  return NextResponse.json({
    leagueId,
    providerStatus: {
      anyAi: providerStatus.anyAi,
      openai: providerStatus.openai,
      deepseek: providerStatus.deepseek,
      xai: providerStatus.xai,
    },
    features: matrix,
  })
}
