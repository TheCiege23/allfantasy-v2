import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const clientApiMocks = vi.hoisted(() => ({
  fetchGroupStageView: vi.fn(),
  saveGroupRanking: vi.fn(),
  saveThirdPlaceAdvancers: vi.fn(),
}))

vi.mock("@/lib/world-cup/worldCupClientApi", () => ({
  fetchWorldCupGroupStageView: clientApiMocks.fetchGroupStageView,
  saveWorldCupGroupRankingClient: clientApiMocks.saveGroupRanking,
  saveWorldCupThirdPlaceAdvancersClient: clientApiMocks.saveThirdPlaceAdvancers,
}))

function makeGroupStageView(overrides: Record<string, unknown> = {}) {
  const group = {
    id: "group-a",
    groupKey: "A",
    displayName: "Group A",
    sortOrder: 1,
    teams: [
      { id: "gt-1", teamId: "team-a", name: "Argentina", country: "Argentina", fifaCode: "ARG", flagUrl: null, logoUrl: null, seedOrder: 1, actualRank: null, points: null, goalDifference: null, goalsFor: null },
      { id: "gt-2", teamId: "team-b", name: "Brazil", country: "Brazil", fifaCode: "BRA", flagUrl: null, logoUrl: null, seedOrder: 2, actualRank: null, points: null, goalDifference: null, goalsFor: null },
      { id: "gt-3", teamId: "team-c", name: "Canada", country: "Canada", fifaCode: "CAN", flagUrl: null, logoUrl: null, seedOrder: 3, actualRank: null, points: null, goalDifference: null, goalsFor: null },
      { id: "gt-4", teamId: "team-d", name: "Denmark", country: "Denmark", fifaCode: "DEN", flagUrl: null, logoUrl: null, seedOrder: 4, actualRank: null, points: null, goalDifference: null, goalsFor: null },
    ],
  }
  return {
    challengeId: "c1",
    entryId: "entry-1",
    groups: [group],
    groupRankingPicks: [
      { id: "grp-1", groupId: "group-a", teamId: "team-a", predictedRank: 1, actualRank: null, isCorrect: null, pointsAwarded: 0 },
      { id: "grp-2", groupId: "group-a", teamId: "team-b", predictedRank: 2, actualRank: null, isCorrect: null, pointsAwarded: 0 },
      { id: "grp-3", groupId: "group-a", teamId: "team-c", predictedRank: 3, actualRank: null, isCorrect: null, pointsAwarded: 0 },
      { id: "grp-4", groupId: "group-a", teamId: "team-d", predictedRank: 4, actualRank: null, isCorrect: null, pointsAwarded: 0 },
    ],
    thirdPlaceAdvancerPicks: [],
    completion: {
      groupsRankedCount: 1,
      allGroupsRanked: false,
      thirdPlaceSelectedCount: 0,
      thirdPlaceComplete: false,
      groupStageComplete: false,
    },
    lock: { isLocked: false, lockReason: null },
    warnings: [],
    ...overrides,
  }
}

describe("WorldCupGroupStagePicks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clientApiMocks.fetchGroupStageView.mockResolvedValue(makeGroupStageView())
    clientApiMocks.saveGroupRanking.mockResolvedValue(makeGroupStageView({
      groupRankingPicks: [
        { id: "grp-1", groupId: "group-a", teamId: "team-b", predictedRank: 1, actualRank: null, isCorrect: null, pointsAwarded: 0 },
        { id: "grp-2", groupId: "group-a", teamId: "team-a", predictedRank: 2, actualRank: null, isCorrect: null, pointsAwarded: 0 },
        { id: "grp-3", groupId: "group-a", teamId: "team-c", predictedRank: 3, actualRank: null, isCorrect: null, pointsAwarded: 0 },
        { id: "grp-4", groupId: "group-a", teamId: "team-d", predictedRank: 4, actualRank: null, isCorrect: null, pointsAwarded: 0 },
      ],
    }))
  })

  it("marks a reordered group dirty and requires Save Group before Review counts it", async () => {
    const onCompletionChanged = vi.fn()
    const WorldCupGroupStagePicks = (await import("@/components/brackets/world-cup/WorldCupGroupStagePicks")).default
    render(<WorldCupGroupStagePicks challengeId="c1" entryId="entry-1" onCompletionChanged={onCompletionChanged} />)

    const group = await screen.findByTestId("world-cup-group-A")
    expect(within(group).getByRole("button", { name: /Saved/i })).toBeDisabled()

    fireEvent.click(within(group).getAllByRole("button", { name: /Move Up/i })[1])

    expect(within(group).getByText(/Unsaved order change/i)).toBeInTheDocument()
    const saveButton = within(group).getByRole("button", { name: /Save Group/i })
    expect(saveButton).toBeEnabled()
    expect(onCompletionChanged).not.toHaveBeenCalled()

    fireEvent.click(saveButton)

    await waitFor(() => expect(clientApiMocks.saveGroupRanking).toHaveBeenCalledWith(
      "c1",
      "entry-1",
      "group-a",
      ["team-b", "team-a", "team-c", "team-d"],
    ))
    await waitFor(() => expect(onCompletionChanged).toHaveBeenCalledTimes(1))
  })

  it("keeps no-op group save disabled and preserves submitted state by not calling save", async () => {
    const WorldCupGroupStagePicks = (await import("@/components/brackets/world-cup/WorldCupGroupStagePicks")).default
    render(<WorldCupGroupStagePicks challengeId="c1" entryId="entry-1" />)

    const group = await screen.findByTestId("world-cup-group-A")
    expect(within(group).getByRole("button", { name: /Saved/i })).toBeDisabled()
    expect(clientApiMocks.saveGroupRanking).not.toHaveBeenCalled()
  })
})
