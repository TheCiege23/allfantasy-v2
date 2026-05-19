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

  it("keeps the production Group Stage endpoint wired to the repair-on-load service", () => {
    const routeSource = readFileSync(join(process.cwd(), routeFiles[0]), "utf8")
    const clientSource = readFileSync(join(process.cwd(), "lib/world-cup/worldCupClientApi.ts"), "utf8")

    expect(clientSource).toContain("/api/brackets/world-cup/${challengeId}/entries/${entryId}/group-stage")
    expect(clientSource).toContain('cache: "no-store"')
    expect(routeSource).toContain("getWorldCupGroupStageView({")
    expect(routeSource).toContain("challengeId: params.data.challengeId")
    expect(routeSource).toContain("entryId: params.data.entryId")
    expect(routeSource).toContain("userId: auth.user.id")
    expect(routeSource).toContain("NextResponse.json({ ok: true, view })")
  })
})
