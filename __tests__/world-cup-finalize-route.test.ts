import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}))

describe("World Cup finalize route service imports", () => {
  it("imports finalize/review services directly instead of the world-cup barrel", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/finalize/route.ts"),
      "utf8"
    )

    expect(source).toContain("@/lib/world-cup/worldCupEntryFinalizeService")
    expect(source).toContain("@/lib/world-cup/worldCupBracketService")
    expect(source).not.toContain('} from "@/lib/world-cup"')
  })

  it("exposes callable finalize review service functions", async () => {
    const service = await import("@/lib/world-cup/worldCupEntryFinalizeService")

    expect(service.getWorldCupEntryCompletionReview).toEqual(expect.any(Function))
    expect(service.finalizeWorldCupEntry).toEqual(expect.any(Function))
  })
})
