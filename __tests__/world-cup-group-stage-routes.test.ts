import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const routeFiles = [
  "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/group-stage/route.ts",
  "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/group-rankings/route.ts",
  "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/third-place-advancers/route.ts",
]

describe("World Cup group stage route imports", () => {
  it("imports group stage gameplay services directly instead of the world-cup barrel", () => {
    for (const routeFile of routeFiles) {
      const source = readFileSync(join(process.cwd(), routeFile), "utf8")

      expect(source).toContain("@/lib/world-cup/worldCupGroupStageService")
      expect(source).not.toContain('from "@/lib/world-cup"')
    }
  })
})
