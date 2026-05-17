import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import PlayoffBracketBoard from "@/components/brackets/playoffs/PlayoffBracketBoard"
import type { PlayoffPickView, PlayoffSeriesView } from "@/lib/playoffs/types"
import { buildProjectedPlayoffSeries, getDependentPlayoffSeriesIds, getNextActionablePlayoffSeries } from "@/lib/playoffs/playoffBracketProjection"

const rounds = ["round_1", "conference_semifinals", "conference_finals", "finals"] as const

const series: PlayoffSeriesView[] = [
  {
    id: "s1",
    round: "round_1",
    roundIndex: 1,
    seriesNumber: 1,
    conference: "east",
    homeSeed: 1,
    awaySeed: 8,
    homeTeamName: "Celtics",
    awayTeamName: "Heat",
    winnerTeamName: null,
    bestOf: 7,
    status: "scheduled",
    startsAt: null,
    nextSeriesNumber: 9,
    nextSeriesSlot: "home",
    sourceSeriesHome: null,
    sourceSeriesAway: null,
  },
  {
    id: "s9",
    round: "conference_semifinals",
    roundIndex: 2,
    seriesNumber: 9,
    conference: "east",
    homeSeed: 0,
    awaySeed: 0,
    homeTeamName: "Winner S1",
    awayTeamName: "Winner S2",
    winnerTeamName: null,
    bestOf: 7,
    status: "scheduled",
    startsAt: null,
    nextSeriesNumber: 13,
    nextSeriesSlot: "home",
    sourceSeriesHome: 1,
    sourceSeriesAway: 2,
  },
]

const picks: PlayoffPickView[] = []

describe("PlayoffBracketBoard", () => {
  it("renders round columns and series cards", () => {
    render(<PlayoffBracketBoard rounds={[...rounds]} series={series} picks={picks} />)

    expect(screen.getByText("Round 1")).toBeInTheDocument()
    expect(screen.getByText("Conference Semis")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Celtics" })).toBeInTheDocument()
  })

  it("calls onPick when a team is selected", () => {
    const onPick = vi.fn()
    render(<PlayoffBracketBoard rounds={[...rounds]} series={series} picks={picks} onPick={onPick} />)

    fireEvent.click(screen.getByRole("button", { name: "Celtics" }))

    expect(onPick).toHaveBeenCalledWith("s1", "Celtics")
  })

  it("disables unresolved projected series with helper text", () => {
    render(<PlayoffBracketBoard rounds={[...rounds]} series={series} picks={picks} />)

    expect(screen.getByTestId("playoff-series-disabled-reason-s9")).toHaveTextContent("Pick earlier round winners first.")
    expect(screen.getByRole("button", { name: "Winner S1" })).toBeDisabled()
  })

  it("disables both team buttons for a series while saving", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series}
        picks={picks}
        savingSeriesIds={new Set(["s1"])}
      />
    )

    expect(screen.getByRole("button", { name: "Celtics" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Heat" })).toBeDisabled()
    expect(screen.getByText("Saving...")).toBeInTheDocument()
  })

  it("renders provider-synced later-round teams without unresolved helper text", () => {
    const providerSynced = series.map((item) => item.id === "s9"
      ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks" }
      : item
    )

    render(<PlayoffBracketBoard rounds={[...rounds]} series={providerSynced} picks={picks} />)

    const syncedSeries = screen.getByTestId("playoff-series-s9")
    expect(screen.queryByTestId("playoff-series-disabled-reason-s9")).not.toBeInTheDocument()
    expect(syncedSeries).toHaveTextContent("Celtics")
    expect(syncedSeries).toHaveTextContent("Knicks")
  })

  it("disables locked synced series before click with clear reason", () => {
    const onPick = vi.fn()
    const lockedSeries = series.map((item) => item.id === "s9"
      ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks", status: "in_progress" as const }
      : item
    )

    render(<PlayoffBracketBoard rounds={[...rounds]} series={lockedSeries} picks={picks} onPick={onPick} />)

    expect(screen.getByTestId("playoff-series-disabled-reason-s9")).toHaveTextContent("Series already started/locked")
    fireEvent.click(screen.getByRole("button", { name: "Knicks" }))
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe("playoff bracket projection", () => {
  it("projects later-round teams from earlier picks", () => {
    const projected = buildProjectedPlayoffSeries(series, [
      {
        id: "p1",
        entryId: "entry-1",
        seriesId: "s1",
        pickTeamName: "Celtics",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Celtics")
  })

  it("projects later-round teams from official winners before user picks", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: "Celtics" } : item),
      [
        {
          id: "p1",
          entryId: "entry-1",
          seriesId: "s1",
          pickTeamName: "Heat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    )

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Celtics")
  })

  it("keeps provider-synced later-round teams even without prior-round picks", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s9"
        ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks" }
        : item
      ),
      []
    )

    expect(projected.find((item) => item.id === "s9")).toMatchObject({
      homeTeamName: "Celtics",
      awayTeamName: "Knicks",
    })
  })

  it("finds next actionable projected series", () => {
    expect(getNextActionablePlayoffSeries(series, [])?.id).toBe("s1")
  })

  it("finds downstream dependent series", () => {
    expect(Array.from(getDependentPlayoffSeriesIds("s1", series))).toEqual(["s9"])
  })
})
