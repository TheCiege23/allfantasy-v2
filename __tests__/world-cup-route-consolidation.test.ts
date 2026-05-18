import { existsSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

describe("World Cup chat route consolidation", () => {
  it("keeps chat feature actions behind the consolidated chat route", () => {
    const oldFeatureRoutes = [
      "app/api/brackets/world-cup/[challengeId]/chat/gifs/route.ts",
      "app/api/brackets/world-cup/[challengeId]/chat/upload-image/route.ts",
      "app/api/brackets/world-cup/[challengeId]/notification-preferences/route.ts",
      "app/api/brackets/world-cup/[challengeId]/chat/[messageId]/poll-vote/route.ts",
    ]

    expect(existsSync(join(repoRoot, "app/api/brackets/world-cup/[challengeId]/chat/route.ts"))).toBe(true)
    for (const routePath of oldFeatureRoutes) {
      expect(existsSync(join(repoRoot, routePath))).toBe(false)
    }
  })
})
