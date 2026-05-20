import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

vi.mock("server-only", () => ({}))

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

  it("keeps knockout pick saves rollout-safe while confidence_points migration is pending", () => {
    const source = readFileSync(join(process.cwd(), "lib/world-cup/worldCupBracketService.ts"), "utf8")

    expect(source).toContain("function worldCupConfidencePointsColumnEnabled()")
    expect(source).toContain("async function worldCupConfidencePointsColumnReadyForWrites()")
    expect(source).toContain("...(confidenceColumnEnabled ? { confidencePoints: true } : {})")
    expect(source).toContain("const confidenceWriteData = input.confidenceColumnEnabled ? { confidencePoints: input.confidencePoints } : {}")
    expect(source).toContain("select: WORLD_CUP_PICK_VIEW_WITH_MATCH_SELECT")
    expect(source).toContain("select: WORLD_CUP_PICK_VIEW_SELECT")
    expect(source).not.toContain("include: { picks: { include: { match: true }, orderBy: { createdAt: \"asc\" } } }")
  })

  it("omits confidencePoints from pick upsert writes when the database column flag is false", async () => {
    const { buildWorldCupPickUpsertArgs } = await import("@/lib/world-cup/worldCupBracketService")
    const args = buildWorldCupPickUpsertArgs({
      challengeId: "challenge-1",
      participantId: "participant-1",
      entryId: "entry-1",
      matchId: "match-1",
      round: "round_of_32",
      selectedTeamId: "team-1",
      selectedSlotKey: "A1",
      selectedTeamName: "Argentina",
      confidencePoints: 12,
      confidenceColumnEnabled: false,
    })

    expect(args.create).not.toHaveProperty("confidencePoints")
    expect(args.update).not.toHaveProperty("confidencePoints")
  })

  it("does not retry a missing confidence column inside the same transaction", () => {
    const source = readFileSync(join(process.cwd(), "lib/world-cup/worldCupBracketService.ts"), "utf8")

    expect(source).not.toContain("isWorldCupConfidencePointsMissingColumnError")
    expect(source).not.toContain("withoutWorldCupPickConfidencePoints")
    expect(source).not.toContain("await tx.worldCupBracketPick.upsert(without")
  })

  it("includes confidencePoints in pick upsert writes when the database column flag is true", async () => {
    const { buildWorldCupPickUpsertArgs } = await import("@/lib/world-cup/worldCupBracketService")
    const args = buildWorldCupPickUpsertArgs({
      challengeId: "challenge-1",
      participantId: "participant-1",
      entryId: "entry-1",
      matchId: "match-1",
      round: "round_of_32",
      selectedTeamId: "team-1",
      selectedSlotKey: "A1",
      selectedTeamName: "Argentina",
      confidencePoints: 12,
      confidenceColumnEnabled: true,
    })

    expect(args.create).toHaveProperty("confidencePoints", 12)
    expect(args.update).toHaveProperty("confidencePoints", 12)
  })
})
