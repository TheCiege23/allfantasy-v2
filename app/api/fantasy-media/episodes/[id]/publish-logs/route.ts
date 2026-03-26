import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFantasyMediaPublishLogs } from "@/lib/fantasy-media/FantasyMediaPublishService"

export const dynamic = "force-dynamic"

/**
 * GET /api/fantasy-media/episodes/[id]/publish-logs
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const logs = await getFantasyMediaPublishLogs(id, session.user.id)

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      destinationType: log.destinationType,
      status: log.status,
      responseMetadata: log.responseMetadata,
      createdAt: log.createdAt,
    })),
  })
}
