import { NextResponse } from "next/server"
import { getAdminAccessState } from "@/lib/adminAuth"
import { maskAdminEmail } from "@/lib/admin-dashboard/AdminCommandCenterService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const state = await getAdminAccessState()

  if (state.status === "unauthenticated") {
    return NextResponse.json(
      { authenticated: false, admin: false, status: state.status },
      { status: 401 }
    )
  }

  if (state.status === "forbidden") {
    return NextResponse.json(
      {
        authenticated: true,
        admin: false,
        status: state.status,
        user: state.user
          ? {
              id: state.user.id ?? null,
              username: state.user.username ?? null,
              emailMasked: maskAdminEmail(state.user.email),
            }
          : null,
      },
      { status: 403 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    admin: true,
    status: state.status,
    source: state.source,
    user: {
      id: state.user.id ?? null,
      username: state.user.username ?? null,
      emailMasked: maskAdminEmail(state.user.email),
    },
  })
}
