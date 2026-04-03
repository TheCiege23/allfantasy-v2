import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SettingsApp from "./components/SettingsApp"

export default async function SettingsPage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; email?: string | null; name?: string | null }
  } | null

  if (!session?.user) {
    redirect("/login?callbackUrl=/settings")
  }

  const userId = session.user.id
  if (!userId) {
    redirect("/login?callbackUrl=/settings")
  }

  const [firstLeague, appUser, subscription] = await Promise.all([
    prisma.league.findFirst({
      where: {
        OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.appUser.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
    prisma.userSubscription.findFirst({
      where: { userId, status: "active" },
      include: { plan: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  const uploadLeagueId = firstLeague?.id ?? null
  const accountCreatedAt = appUser?.createdAt?.toISOString() ?? null
  const planLabel = subscription?.plan?.name ?? null

  return (
    <SettingsApp
      uploadLeagueId={uploadLeagueId}
      accountCreatedAt={accountCreatedAt}
      planLabel={planLabel}
    />
  )
}
