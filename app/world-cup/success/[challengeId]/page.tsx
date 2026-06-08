import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import WorldCupSuccessClient from "./WorldCupSuccessClient"

export const dynamic = "force-dynamic"

type Props = { params: { challengeId: string } }

/**
 * /world-cup/success/[challengeId] — invite-first success screen.
 *
 * Shown immediately after pool creation from the guest draft flow.
 * Primary goal: get the user to share their invite link right now.
 */
export default async function WorldCupSuccessPage({ params }: Props) {
  const session = await getServerSession(authOptions as any).catch(() => null)
  if (!session?.user) {
    redirect(
      `/signup?intent=world-cup-pool&next=${encodeURIComponent(`/world-cup/success/${params.challengeId}`)}&callbackUrl=${encodeURIComponent(`/world-cup/success/${params.challengeId}`)}`
    )
  }

  return <WorldCupSuccessClient challengeId={params.challengeId} />
}
