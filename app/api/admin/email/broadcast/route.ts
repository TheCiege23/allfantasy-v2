import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/adminAuth"
import {
  EMAIL_AUDIENCES,
  getEmailCenterStatus,
  runAdminEmailAction,
  type AdminEmailAudience,
} from "@/lib/admin-dashboard/AdminEmailCenterService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  mode: z.enum(["preview", "test", "send"]).default("preview"),
  audience: z.enum(EMAIL_AUDIENCES.map((audience) => audience.id) as [AdminEmailAudience, ...AdminEmailAudience[]]),
  subject: z.string().min(4).max(140),
  body: z.string().min(10).max(8000),
  confirm: z.boolean().optional(),
})

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const status = await getEmailCenterStatus()
  return NextResponse.json({
    ok: true,
    status,
  })
}
export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid email broadcast request.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await runAdminEmailAction({
      ...parsed.data,
      adminEmail: gate.user.email ?? null,
    })
    const status = result.ok ? 200 : result.mode === "send" && /rate limit/i.test(result.message) ? 429 : 400
    return NextResponse.json(result, { status })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to process email broadcast.",
      },
      { status: 400 }
    )
  }
}
