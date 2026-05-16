import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("World Cup finalize lock route wiring", () => {
  it("uses the canonical locked message from the direct bracket service import", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/finalize/route.ts"),
      "utf8"
    )

    expect(source).toContain("WORLD_CUP_BRACKET_LOCKED_MESSAGE")
    expect(source).toContain("@/lib/world-cup/worldCupBracketService")
    expect(source).toContain("{ status: 423 }")
  })
})
