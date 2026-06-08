import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import WorldCupFinishClient from "./WorldCupFinishClient"

export const dynamic = "force-dynamic"

/**
 * /world-cup/finish — authenticated post-draft conversion page.
 *
 * Server component: gates on session. If no session, redirects to signup
 * with intent preserved. The client component then reads the localStorage
 * draft and creates the real pool via the existing /api/brackets/world-cup/create
 * endpoint.
 */
export default async function WorldCupFinishPage() {
  const session = await getServerSession(authOptions as any).catch(() => null)
  if (!session?.user) {
    redirect(
      `/signup?intent=world-cup-pool&next=${encodeURIComponent("/world-cup/finish")}&callbackUrl=${encodeURIComponent("/world-cup/finish")}`
    )
  }

  return <WorldCupFinishClient />
}
