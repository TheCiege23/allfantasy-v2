import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/push/vapid-public-key
 * Returns the public VAPID key for client-side push subscription.
 * No auth required (public key is safe to expose).
 */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY?.trim()
  if (!key) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    )
  }
  return NextResponse.json({ publicKey: key })
}
