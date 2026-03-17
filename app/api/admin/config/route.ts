import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getFeatureTogglesSnapshot, setBoolean, setStringArray, FEATURE_KEYS } from "@/lib/feature-toggle"
import { invalidateConfigCache } from "@/lib/feature-toggle"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  try {
    const snapshot = await getFeatureTogglesSnapshot()
    return NextResponse.json(snapshot)
  } catch (e) {
    console.error("[admin/config]", e)
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  try {
    const body = await req.json().catch(() => ({})) as {
      key?: string
      value?: unknown
      sports?: string[]
    }
    const { key, value, sports } = body
    if (Array.isArray(sports)) {
      await setStringArray(FEATURE_KEYS.SPORTS_AVAILABILITY, sports)
    } else if (key === FEATURE_KEYS.SPORTS_AVAILABILITY) {
      const arr = Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []
      await setStringArray(key, arr)
    } else if (typeof key === "string" && (value === true || value === false)) {
      await setBoolean(key, value)
    } else {
      return NextResponse.json({ error: "Invalid key or value" }, { status: 400 })
    }
    invalidateConfigCache()
    const snapshot = await getFeatureTogglesSnapshot()
    return NextResponse.json(snapshot)
  } catch (e) {
    console.error("[admin/config]", e)
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}
