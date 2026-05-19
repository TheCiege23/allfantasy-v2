import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("World Cup finalize meaningful edit guards", () => {
  it("does not auto-submit completed knockout saves", () => {
    const source = readFileSync(join(process.cwd(), "lib/world-cup/worldCupBracketService.ts"), "utf8")

    expect(source).toContain("let meaningfulPickChange = false")
    expect(source).toContain("submittedAt: complete && !meaningfulPickChange ? entry.submittedAt : null")
    expect(source).not.toContain("submittedAt: complete ? new Date() : null")
  })

  it("does not invent submittedAt during recalculation", () => {
    const source = readFileSync(join(process.cwd(), "lib/world-cup/worldCupScoringService.ts"), "utf8")

    expect(source).toContain("submittedAt: entryComplete ? freshEntry?.submittedAt ?? null : null")
    expect(source).not.toContain("submittedAt: entryComplete ? freshEntry?.submittedAt ?? new Date() : null")
  })

  it("clears submittedAt only for meaningful group ranking and third-place changes", () => {
    const source = readFileSync(join(process.cwd(), "lib/world-cup/worldCupGroupStageService.ts"), "utf8")

    expect(source).toContain("const rankingChanged = !sameOrderedValues")
    expect(source).toContain("if (rankingChanged && entry.submittedAt)")
    expect(source).toContain("const thirdPlaceChanged = !sameValueSet")
    expect(source).toContain("if (thirdPlaceChanged && entry.submittedAt)")
  })

  it("marks finalized entries incomplete when downstream knockout picks are actually deleted", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/brackets/world-cup/[challengeId]/entries/[entryId]/picks/route.ts"),
      "utf8",
    )

    expect(source).toContain("const deleted = await prisma.worldCupBracketPick.deleteMany")
    expect(source).toContain("if (deleted.count > 0 && entry.submittedAt)")
    expect(source).toContain("data: { submittedAt: null, isComplete: false }")
  })
})
