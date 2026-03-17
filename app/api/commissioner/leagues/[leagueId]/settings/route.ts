import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertCommissioner } from "@/lib/commissioner/permissions"
import { getLeagueConfiguration } from "@/lib/commissioner-settings"
import { validateCommissionerPatch } from "@/lib/commissioner-settings"
import type { LeagueSettingsPatch } from "@/lib/commissioner-settings/types"

export async function GET(
  _req: Request,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const config = await getLeagueConfiguration(params.leagueId)
  if (!config) return NextResponse.json({ error: "League not found" }, { status: 404 })
  return NextResponse.json(config)
}

export async function PATCH(
  req: Request,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as LeagueSettingsPatch
  const validation = validateCommissionerPatch(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  const { updateLeagueSettings } = await import("@/lib/commissioner-settings/CommissionerSettingsService")
  const updated = await updateLeagueSettings(params.leagueId, body)
  if (!updated) return NextResponse.json({ error: "League not found" }, { status: 404 })
  return NextResponse.json(updated)
}
