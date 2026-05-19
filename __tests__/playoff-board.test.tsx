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

function playoffPick(overrides: Partial<PlayoffPickView>): PlayoffPickView {
  return {
    id: "p1",
    entryId: "e1",
    seriesId: "s1",
    pickTeamName: "Celtics",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  }
}

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

  it("shows official matchup TBD in official bracket mode when later-round teams are unknown", () => {
    render(<PlayoffBracketBoard rounds={[...rounds]} series={series} picks={picks} officialBracketMode />)

    expect(screen.getByTestId("playoff-series-disabled-reason-s9")).toHaveTextContent("Official matchup TBD.")
    expect(screen.queryByText("Pick earlier round winners first.")).not.toBeInTheDocument()
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

  it("allows late/test picks for completed synced series when lock rule is none", () => {
    const onPick = vi.fn()
    const lockedSeries = series.map((item) => item.id === "s9"
      ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks", status: "final" as const }
      : item
    )

    render(<PlayoffBracketBoard rounds={[...rounds]} series={lockedSeries} picks={picks} onPick={onPick} lockRule="none" canUseLatePicks />)

    expect(screen.queryByTestId("playoff-series-disabled-reason-s9")).not.toBeInTheDocument()
    expect(screen.getByTestId("playoff-series-late-picks-s9")).toHaveTextContent("Late/test picks enabled.")
    fireEvent.click(screen.getByRole("button", { name: "Knicks" }))
    expect(onPick).toHaveBeenCalledWith("s9", "Knicks")
  })

  it("shows lock diagnostics for no-lock late pick context", () => {
    const startedSeries = series.map((item) => item.id === "s9"
      ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks", status: "in_progress" as const }
      : item
    )

    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={startedSeries}
        picks={picks}
        lockRule="none"
        canUseLatePicks
        showLockDiagnostics
        lockDiagnostics={{ allowTestLatePicks: true, viewerCanLatePick: true }}
      />
    )

    expect(screen.getByTestId("playoff-series-lock-diagnostics-s9")).toHaveTextContent("lockRule=none")
    expect(screen.getByTestId("playoff-series-lock-diagnostics-s9")).toHaveTextContent("viewerCanLatePick=true")
    expect(screen.getByTestId("playoff-series-lock-diagnostics-s9")).toHaveTextContent("reason=unlocked")
  })

  it("keeps started series locked for strict/default pools", () => {
    const onPick = vi.fn()
    const startedSeries = series.map((item) => item.id === "s9"
      ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks", status: "in_progress" as const }
      : item
    )

    render(<PlayoffBracketBoard rounds={[...rounds]} series={startedSeries} picks={picks} onPick={onPick} lockRule="series_start" canUseLatePicks />)

    expect(screen.getByTestId("playoff-series-disabled-reason-s9")).toHaveTextContent("Series already started/locked")
    fireEvent.click(screen.getByRole("button", { name: "Knicks" }))
    expect(onPick).not.toHaveBeenCalled()
  })

  it("renders series summary, next game fallback, and live score", () => {
    const richSeries = series.map((item) => item.id === "s1"
      ? {
          ...item,
          seriesSummary: "Celtics lead series 3-1",
          nextGameAt: "2099-05-21T20:30:00.000Z",
          broadcastNetwork: null,
          liveHomeScore: 84,
          liveAwayScore: 79,
          liveStatus: "3Q",
          venue: null,
        }
      : item
    )

    render(<PlayoffBracketBoard rounds={[...rounds]} series={richSeries} picks={picks} />)

    expect(screen.getByTestId("playoff-series-summary-s1")).toHaveTextContent("Celtics lead series 3-1")
    expect(screen.getByTestId("playoff-series-next-s1")).toHaveTextContent("Next:")
    expect(screen.getByTestId("playoff-series-next-s1")).toHaveTextContent("TBD")
    expect(screen.getByTestId("playoff-series-venue-s1")).toHaveTextContent("Venue TBD")
    expect(screen.getByTestId("playoff-series-live-s1")).toHaveTextContent("Live: Celtics 84, Heat 79 — 3Q")
  })

  it("renders broadcast, venue, and final game score on card", () => {
    const richSeries = series.map((item) => item.id === "s1"
      ? {
          ...item,
          nextGameAt: "2099-05-21T20:30:00.000Z",
          broadcastNetwork: "ESPN",
          venue: "Madison Square Garden",
          providerGamesJson: [
            {
              homeTeam: "Celtics",
              awayTeam: "Heat",
              homeScore: 111,
              awayScore: 104,
              status: "STATUS_FINAL",
              statusDetail: "Final",
              startTime: "2099-05-19T20:30:00.000Z",
            },
          ],
        }
      : item
    )

    render(<PlayoffBracketBoard rounds={[...rounds]} series={richSeries} picks={picks} />)

    expect(screen.getByTestId("playoff-series-next-s1")).toHaveTextContent("ESPN")
    expect(screen.getByTestId("playoff-series-venue-s1")).toHaveTextContent("At Madison Square Garden")
    expect(screen.getByTestId("playoff-series-final-s1")).toHaveTextContent("Final: Celtics 111, Heat 104")
  })

  it("does not show pick result badges by default", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: "Celtics", seriesSummary: "Celtics win series 4-1" } : item)}
        picks={[playoffPick({ pickTeamName: "Celtics" })]}
      />
    )

    expect(screen.queryByTestId("playoff-series-pick-result-s1")).not.toBeInTheDocument()
  })

  it("does not apply result border classes when verification is disabled", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: "Celtics", seriesSummary: "Celtics win series 4-1" } : item)}
        picks={[playoffPick({ pickTeamName: "Celtics" })]}
      />
    )

    const matchupCard = screen.getByTestId("playoff-series-s1")
    expect(matchupCard).toHaveClass("border-slate-200")
    expect(matchupCard).not.toHaveClass("border-cyan-400")
    expect(matchupCard).not.toHaveClass("border-rose-500")
    expect(matchupCard).not.toHaveClass("border-amber-400")
  })

  it("renders correct pick badge when verification is enabled", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: "Celtics", seriesSummary: "Celtics win series 4-1" } : item)}
        picks={[playoffPick({ pickTeamName: "Celtics" })]}
        showPickResults
      />
    )

    expect(screen.getByTestId("playoff-series-s1")).toHaveClass("border-cyan-400")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: Celtics")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Correct +1")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Result: Celtics win series 4-1")
  })

  it("renders wrong pick badge when verification is enabled", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: "Heat", seriesSummary: "Heat win series 4-2" } : item)}
        picks={[playoffPick({ pickTeamName: "Celtics" })]}
        showPickResults
      />
    )

    expect(screen.getByTestId("playoff-series-s1")).toHaveClass("border-rose-500")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Wrong +0")
  })

  it("applies an amber result border for no-pick series when verification is enabled", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: "Heat", seriesSummary: "Heat win series 4-2" } : item)}
        picks={[]}
        showPickResults
      />
    )

    expect(screen.getByTestId("playoff-series-s1")).toHaveClass("border-amber-400")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: No Pick")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("No Pick")
  })

  it("applies an amber result border for pending saved picks when verification is enabled", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1" ? { ...item, winnerTeamName: null, seriesSummary: "Celtics lead series 2-1" } : item)}
        picks={[playoffPick({ pickTeamName: "Celtics" })]}
        showPickResults
      />
    )

    expect(screen.getByTestId("playoff-series-s1")).toHaveClass("border-amber-400")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: Celtics")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Pending")
  })

  it("keeps a wrong saved user pick highlighted when official winner differs", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1"
          ? {
              ...item,
              homeTeamName: "Boston Celtics",
              awayTeamName: "Philadelphia 76ers",
              winnerTeamName: "Philadelphia 76ers",
              seriesSummary: "Philadelphia 76ers win series 4-2",
              status: "final" as const,
            }
          : item)}
        picks={[playoffPick({ pickTeamName: "Boston Celtics" })]}
        showPickResults
      />
    )

    expect(screen.getByRole("button", { name: "Boston Celtics" })).toHaveClass("border-amber-500")
    expect(screen.getByRole("button", { name: "Philadelphia 76ers" })).not.toHaveClass("border-amber-500")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: Boston Celtics")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Wrong +0")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Result: Philadelphia 76ers win series 4-2")
  })

  it("does not highlight official winner when no user pick is saved", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1"
          ? {
              ...item,
              homeTeamName: "Boston Celtics",
              awayTeamName: "Philadelphia 76ers",
              winnerTeamName: "Philadelphia 76ers",
              seriesSummary: "Philadelphia 76ers win series 4-2",
              status: "final" as const,
            }
          : item)}
        picks={[]}
        showPickResults
      />
    )

    expect(screen.getByRole("button", { name: "Boston Celtics" })).not.toHaveClass("border-amber-500")
    expect(screen.getByRole("button", { name: "Philadelphia 76ers" })).not.toHaveClass("border-amber-500")
    expect(screen.getByTestId("playoff-series-s1")).toHaveClass("border-amber-400")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: No Pick")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("No Pick")
  })

  it("renders NHL no-pick result when official winner exists without a user pick", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1"
          ? {
              ...item,
              homeTeamName: "Rangers",
              awayTeamName: "Islanders",
              winnerTeamName: "Rangers",
              seriesSummary: "Rangers win series 4-2",
            }
          : item)}
        picks={[]}
        showPickResults
      />
    )

    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: No Pick")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("No Pick")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).not.toHaveTextContent("Correct +1")
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

  it("projects later-round teams from user picks before official winners in user projection mode", () => {
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

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Heat")
  })

  it("advances Boston Celtics in My Projection when official winner is Philadelphia 76ers", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s1"
        ? {
            ...item,
            homeTeamName: "Boston Celtics",
            awayTeamName: "Philadelphia 76ers",
            winnerTeamName: "Philadelphia 76ers",
            seriesSummary: "Philadelphia 76ers win series 4-2",
          }
        : item),
      [
        {
          id: "p1",
          entryId: "entry-1",
          seriesId: "s1",
          pickTeamName: "Boston Celtics",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      { includeUserPicks: true }
    )

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Boston Celtics")
    expect(projected.find((item) => item.id === "s9")?.homeTeamName).not.toBe("Philadelphia 76ers")
  })

  it("does not advance official winners in My Projection when no saved pick exists", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s1"
        ? {
            ...item,
            homeTeamName: "Boston Celtics",
            awayTeamName: "Philadelphia 76ers",
            winnerTeamName: "Philadelphia 76ers",
          }
        : item),
      [],
      { includeUserPicks: true }
    )

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Winner S1")
  })

  it("advances official winners only when user picks are excluded", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s1"
        ? {
            ...item,
            homeTeamName: "Boston Celtics",
            awayTeamName: "Philadelphia 76ers",
            winnerTeamName: "Philadelphia 76ers",
          }
        : item),
      [
        {
          id: "p1",
          entryId: "entry-1",
          seriesId: "s1",
          pickTeamName: "Boston Celtics",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      { includeUserPicks: false }
    )

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Philadelphia 76ers")
  })

  it("keeps saved Boston pick highlighted and wrong after Philadelphia result sync", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s1"
          ? {
              ...item,
              homeTeamName: "Boston Celtics",
              awayTeamName: "Philadelphia 76ers",
              winnerTeamName: "Philadelphia 76ers",
              seriesSummary: "Philadelphia 76ers win series 4-2",
            }
          : item)}
        picks={[{
          id: "p1",
          entryId: "entry-1",
          seriesId: "s1",
          pickTeamName: "Boston Celtics",
          createdAt: "",
          updatedAt: "",
        }]}
        showPickResults
      />
    )

    expect(screen.getByRole("button", { name: "Boston Celtics" })).toHaveClass("border-amber-500")
    expect(screen.getByRole("button", { name: "Philadelphia 76ers" })).not.toHaveClass("border-amber-500")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Your pick: Boston Celtics")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Wrong +0")
    expect(screen.getByTestId("playoff-series-pick-result-s1")).toHaveTextContent("Result: Philadelphia 76ers win series 4-2")
  })

  it("preserves saved pick name when projected team label differs", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s1"
        ? {
            ...item,
            homeTeamName: "Celtics",
            awayTeamName: "76ers",
            winnerTeamName: "76ers",
          }
        : item),
      [{
        id: "p1",
        entryId: "entry-1",
        seriesId: "s1",
        pickTeamName: "Boston Celtics",
        createdAt: "",
        updatedAt: "",
      }]
    )

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Boston Celtics")
  })

  it("uses NHL saved picks instead of official winners in My Projection", () => {
    const nhlSeries = series.map((item) => item.id === "s1"
      ? {
          ...item,
          homeTeamName: "New York Rangers",
          awayTeamName: "New York Islanders",
          winnerTeamName: "New York Islanders",
        }
      : item)
    const projected = buildProjectedPlayoffSeries(nhlSeries, [{
      id: "p1",
      entryId: "entry-1",
      seriesId: "s1",
      pickTeamName: "New York Rangers",
      createdAt: "",
      updatedAt: "",
    }])

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("New York Rangers")
  })

  it("projects NBA Conference Finals and Finals from saved user picks", () => {
    const fullSeries: PlayoffSeriesView[] = [
      ...series,
      {
        ...series[1],
        id: "s2",
        seriesNumber: 2,
        homeTeamName: "Knicks",
        awayTeamName: "76ers",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        ...series[1],
        id: "s10",
        seriesNumber: 10,
        homeTeamName: "Winner S3",
        awayTeamName: "Winner S4",
        sourceSeriesHome: 3,
        sourceSeriesAway: 4,
      },
      {
        ...series[1],
        id: "s3",
        seriesNumber: 3,
        homeTeamName: "Bucks",
        awayTeamName: "Pacers",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        ...series[1],
        id: "s4",
        seriesNumber: 4,
        homeTeamName: "Cavaliers",
        awayTeamName: "Magic",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        ...series[1],
        id: "s13",
        round: "conference_finals",
        roundIndex: 3,
        seriesNumber: 13,
        homeTeamName: "East Winner A",
        awayTeamName: "East Winner B",
        sourceSeriesHome: 9,
        sourceSeriesAway: 10,
      },
      {
        ...series[1],
        id: "s14",
        round: "conference_finals",
        roundIndex: 3,
        seriesNumber: 14,
        homeTeamName: "Thunder",
        awayTeamName: "Timberwolves",
        sourceSeriesHome: null,
        sourceSeriesAway: null,
      },
      {
        ...series[1],
        id: "s15",
        round: "finals",
        roundIndex: 4,
        seriesNumber: 15,
        homeTeamName: "East Champion",
        awayTeamName: "West Champion",
        sourceSeriesHome: 13,
        sourceSeriesAway: 14,
      },
    ]
    const projected = buildProjectedPlayoffSeries(fullSeries, [
      { id: "p1", entryId: "entry-1", seriesId: "s1", pickTeamName: "Celtics", createdAt: "", updatedAt: "" },
      { id: "p2", entryId: "entry-1", seriesId: "s2", pickTeamName: "Knicks", createdAt: "", updatedAt: "" },
      { id: "p3", entryId: "entry-1", seriesId: "s3", pickTeamName: "Pacers", createdAt: "", updatedAt: "" },
      { id: "p4", entryId: "entry-1", seriesId: "s4", pickTeamName: "Cavaliers", createdAt: "", updatedAt: "" },
      { id: "p9", entryId: "entry-1", seriesId: "s9", pickTeamName: "Celtics", createdAt: "", updatedAt: "" },
      { id: "p10", entryId: "entry-1", seriesId: "s10", pickTeamName: "Pacers", createdAt: "", updatedAt: "" },
      { id: "p13", entryId: "entry-1", seriesId: "s13", pickTeamName: "Celtics", createdAt: "", updatedAt: "" },
      { id: "p14", entryId: "entry-1", seriesId: "s14", pickTeamName: "Thunder", createdAt: "", updatedAt: "" },
    ])

    expect(projected.find((item) => item.id === "s13")).toMatchObject({
      homeTeamName: "Celtics",
      awayTeamName: "Pacers",
    })
    expect(projected.find((item) => item.id === "s15")).toMatchObject({
      homeTeamName: "Celtics",
      awayTeamName: "Thunder",
    })
  })

  it("projects West semifinals from S5-S6 and S7-S8 saved picks", () => {
    const westSeries: PlayoffSeriesView[] = [
      {
        ...series[0],
        id: "s5",
        seriesNumber: 5,
        conference: "west",
        homeTeamName: "Oklahoma City Thunder",
        awayTeamName: "Memphis Grizzlies",
        nextSeriesNumber: 11,
        nextSeriesSlot: "home",
      },
      {
        ...series[0],
        id: "s6",
        seriesNumber: 6,
        conference: "west",
        homeTeamName: "Los Angeles Lakers",
        awayTeamName: "Houston Rockets",
        nextSeriesNumber: 11,
        nextSeriesSlot: "away",
      },
      {
        ...series[0],
        id: "s7",
        seriesNumber: 7,
        conference: "west",
        homeTeamName: "Denver Nuggets",
        awayTeamName: "LA Clippers",
        nextSeriesNumber: 12,
        nextSeriesSlot: "home",
      },
      {
        ...series[0],
        id: "s8",
        seriesNumber: 8,
        conference: "west",
        homeTeamName: "San Antonio Spurs",
        awayTeamName: "Portland Trail Blazers",
        nextSeriesNumber: 12,
        nextSeriesSlot: "away",
      },
      {
        ...series[1],
        id: "s11",
        seriesNumber: 11,
        conference: "west",
        homeTeamName: "Winner S5",
        awayTeamName: "Winner S6",
        sourceSeriesHome: 5,
        sourceSeriesAway: 6,
      },
      {
        ...series[1],
        id: "s12",
        seriesNumber: 12,
        conference: "west",
        homeTeamName: "Winner S7",
        awayTeamName: "Winner S8",
        sourceSeriesHome: 7,
        sourceSeriesAway: 8,
      },
    ]
    const projected = buildProjectedPlayoffSeries(westSeries, [
      { id: "p5", entryId: "entry-1", seriesId: "s5", pickTeamName: "Oklahoma City Thunder", createdAt: "", updatedAt: "" },
      { id: "p6", entryId: "entry-1", seriesId: "s6", pickTeamName: "Los Angeles Lakers", createdAt: "", updatedAt: "" },
      { id: "p7", entryId: "entry-1", seriesId: "s7", pickTeamName: "Minnesota Timberwolves", createdAt: "", updatedAt: "" },
      { id: "p8", entryId: "entry-1", seriesId: "s8", pickTeamName: "San Antonio Spurs", createdAt: "", updatedAt: "" },
    ])

    expect(projected.find((item) => item.id === "s11")).toMatchObject({
      homeTeamName: "Oklahoma City Thunder",
      awayTeamName: "Los Angeles Lakers",
    })
    expect(projected.find((item) => item.id === "s12")).toMatchObject({
      homeTeamName: "Minnesota Timberwolves",
      awayTeamName: "San Antonio Spurs",
    })
    expect(projected.find((item) => item.id === "s11")).not.toMatchObject({
      homeTeamName: "Minnesota Timberwolves",
      awayTeamName: "Los Angeles Lakers",
    })
    expect(projected.find((item) => item.id === "s12")).not.toMatchObject({
      homeTeamName: "San Antonio Spurs",
      awayTeamName: "Oklahoma City Thunder",
    })
  })

  it("projects later-round teams from official winners when user picks are excluded", () => {
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
      ],
      { includeUserPicks: false }
    )

    expect(projected.find((item) => item.id === "s9")?.homeTeamName).toBe("Celtics")
  })

  it("keeps provider-synced later-round teams in official bracket mode", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s9"
        ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks" }
        : item
      ),
      [],
      { includeUserPicks: false }
    )

    expect(projected.find((item) => item.id === "s9")).toMatchObject({
      homeTeamName: "Celtics",
      awayTeamName: "Knicks",
    })
  })

  it("does not keep provider-synced source-linked teams in My Projection without saved picks", () => {
    const projected = buildProjectedPlayoffSeries(
      series.map((item) => item.id === "s9"
        ? { ...item, homeTeamName: "Celtics", awayTeamName: "Knicks" }
        : item
      ),
      [],
      { includeUserPicks: true }
    )

    expect(projected.find((item) => item.id === "s9")).toMatchObject({
      homeTeamName: "Winner S1",
      awayTeamName: "Winner S2",
    })
  })

  it("renders date-only next game schedule with TBD time and venue", () => {
    render(
      <PlayoffBracketBoard
        rounds={[...rounds]}
        series={series.map((item) => item.id === "s9"
          ? {
              ...item,
              homeTeamName: "Thunder",
              awayTeamName: "Nuggets",
              providerGamesJson: [{
                homeTeam: "Thunder",
                awayTeam: "Nuggets",
                startTime: "2026-05-18",
                status: "STATUS_SCHEDULED",
              }],
            }
          : item)}
        picks={[]}
      />
    )

    expect(screen.getByTestId("playoff-series-next-s9")).toHaveTextContent("Next: Mon, May 18 — TBD")
    expect(screen.getByTestId("playoff-series-venue-s9")).toHaveTextContent("Venue TBD")
  })

  it("finds next actionable projected series", () => {
    expect(getNextActionablePlayoffSeries(series, [])?.id).toBe("s1")
  })

  it("finds downstream dependent series", () => {
    expect(Array.from(getDependentPlayoffSeriesIds("s1", series))).toEqual(["s9"])
  })
})
