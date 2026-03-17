import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ContentFeedPage } from "@/components/content-feed"

export const dynamic = "force-dynamic"

export default async function FeedPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/feed")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <ContentFeedPage />
      </div>
    </div>
  )
}
