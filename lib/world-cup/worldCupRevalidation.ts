import { revalidatePath } from "next/cache"

export function revalidateWorldCupJoinSurfaces(input: {
  challengeId?: string | null
  inviteCode?: string | null
}) {
  const paths = new Set<string>([
    "/dashboard",
    "/brackets",
    "/brackets/world-cup",
    "/brackets/world-cup/discover",
    "/brackets/world-cup/join",
  ])

  if (input.challengeId) {
    paths.add(`/brackets/world-cup/${input.challengeId}`)
    paths.add(`/brackets/world-cup/${input.challengeId}/leaderboard`)
  }

  if (input.inviteCode) {
    paths.add(`/join/bracket/${encodeURIComponent(input.inviteCode)}`)
  }

  for (const path of paths) {
    try {
      revalidatePath(path)
    } catch (error) {
      console.warn("[world-cup] failed to revalidate join surface", {
        path,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
