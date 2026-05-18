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

  it("renders group ranking result borders from saved pick scoring", async () => {
    clientApiMocks.fetchGroupStageView.mockResolvedValue(makeGroupStageView({
      groups: [{
        id: "group-a",
        groupKey: "A",
        displayName: "Group A",
        sortOrder: 1,
        teams: [
          { id: "gt-1", teamId: "team-a", name: "Argentina", country: "Argentina", fifaCode: "ARG", flagUrl: null, logoUrl: null, seedOrder: 1, actualRank: 1, points: 9, goalDifference: 4, goalsFor: 6 },
          { id: "gt-2", teamId: "team-b", name: "Brazil", country: "Brazil", fifaCode: "BRA", flagUrl: null, logoUrl: null, seedOrder: 2, actualRank: 3, points: 4, goalDifference: 0, goalsFor: 3 },
          { id: "gt-3", teamId: "team-c", name: "Canada", country: "Canada", fifaCode: "CAN", flagUrl: null, logoUrl: null, seedOrder: 3, actualRank: null, points: null, goalDifference: null, goalsFor: null },
          { id: "gt-4", teamId: "team-d", name: "Denmark", country: "Denmark", fifaCode: "DEN", flagUrl: null, logoUrl: null, seedOrder: 4, actualRank: 4, points: 0, goalDifference: -5, goalsFor: 1 },
        ],
      }],
      groupRankingPicks: [
        { id: "grp-1", groupId: "group-a", teamId: "team-a", predictedRank: 1, actualRank: 1, isCorrect: true, pointsAwarded: 5 },
        { id: "grp-2", groupId: "group-a", teamId: "team-b", predictedRank: 2, actualRank: 3, isCorrect: false, pointsAwarded: 0 },
        { id: "grp-3", groupId: "group-a", teamId: "team-c", predictedRank: 3, actualRank: null, isCorrect: null, pointsAwarded: 0 },
        { id: "grp-4", groupId: "group-a", teamId: "team-d", predictedRank: 4, actualRank: 4, isCorrect: true, pointsAwarded: 5 },
      ],
    }))

    const WorldCupGroupStagePicks = (await import("@/components/brackets/world-cup/WorldCupGroupStagePicks")).default
    render(<WorldCupGroupStagePicks challengeId="c1" entryId="entry-1" />)

    expect(await screen.findByTestId("world-cup-group-pick-result-A-team-a")).toHaveAttribute("data-result-state", "correct")
    expect(screen.getByTestId("world-cup-group-pick-result-A-team-a")).toHaveTextContent("Correct +5")
    expect(screen.getByTestId("world-cup-group-pick-result-A-team-b")).toHaveAttribute("data-result-state", "wrong")
    expect(screen.getByTestId("world-cup-group-pick-result-A-team-b")).toHaveTextContent("Wrong +0")
    expect(screen.getByTestId("world-cup-group-pick-result-A-team-c")).toHaveAttribute("data-result-state", "pending")
    expect(screen.getByTestId("world-cup-group-pick-result-A-team-c")).toHaveTextContent("Pending")
  })

  it("renders third-place advancer result borders from saved pick scoring", async () => {
    clientApiMocks.fetchGroupStageView.mockResolvedValue(makeGroupStageView({
      completion: {
        groupsRankedCount: 12,
        allGroupsRanked: true,
        thirdPlaceSelectedCount: 2,
        thirdPlaceComplete: false,
        groupStageComplete: false,
      },
      thirdPlaceAdvancerPicks: [
        { id: "tp-1", groupId: "group-a", teamId: "team-c", isSelected: true, actualAdvanced: true, isCorrect: true, pointsAwarded: 5 },
        { id: "tp-2", groupId: "group-a", teamId: "team-d", isSelected: true, actualAdvanced: false, isCorrect: false, pointsAwarded: 0 },
      ],
    }))

    const WorldCupGroupStagePicks = (await import("@/components/brackets/world-cup/WorldCupGroupStagePicks")).default
    render(<WorldCupGroupStagePicks challengeId="c1" entryId="entry-1" />)

    const thirdPlace = await screen.findByTestId("world-cup-third-place-result-A")
    expect(thirdPlace).toHaveAttribute("data-result-state", "correct")
    expect(thirdPlace).toHaveAttribute("data-selected", "true")
    expect(thirdPlace).toHaveTextContent("Selected to advance")
    expect(thirdPlace).toHaveTextContent("Correct +5")
  })

  it("makes selected third-place advancer cards obvious on mobile/dark UI", async () => {
    clientApiMocks.fetchGroupStageView.mockResolvedValue(makeGroupStageView({
      completion: {
        groupsRankedCount: 12,
        allGroupsRanked: true,
        thirdPlaceSelectedCount: 1,
        thirdPlaceComplete: false,
        groupStageComplete: false,
      },
      thirdPlaceAdvancerPicks: [
        { id: "tp-1", groupId: "group-a", teamId: "team-c", isSelected: true, actualAdvanced: null, isCorrect: null, pointsAwarded: 0 },
      ],
    }))

    const WorldCupGroupStagePicks = (await import("@/components/brackets/world-cup/WorldCupGroupStagePicks")).default
    render(<WorldCupGroupStagePicks challengeId="c1" entryId="entry-1" />)

    const selectedCard = await screen.findByTestId("world-cup-third-place-result-A")
    expect(selectedCard).toHaveAttribute("data-selected", "true")
    expect(selectedCard.className).toContain("bg-cyan-300/18")
    expect(selectedCard.className).toContain("border-cyan-200")
    expect(within(selectedCard).getByText("Selected to advance")).toBeInTheDocument()
    expect(within(selectedCard).getByRole("checkbox", { name: /Select Canada as a third-place advancer/i })).toBeChecked()
  })
})
