import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MyPoolsTab from "@/components/bracket/MyPoolsTab"

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/bracket-challenge", () => ({
  resolveBracketChallengeLabel: () => "Bracket",
  resolveBracketSportUI: () => ({ badge: "BR", shortLabel: "Bracket" }),
}))

describe("MyPoolsTab", () => {
  it("skips malformed pool rows", () => {
    render(
      <MyPoolsTab
        pools={[
          null as any,
          { id: "", name: "Bad" } as any,
          { id: "ok-1", name: "", sport: null, members: undefined, entries: undefined } as any,
        ]}
      />
    )

    expect(screen.getByText("Untitled Pool")).toBeInTheDocument()
    expect(screen.queryByText("Bad")).not.toBeInTheDocument()
  })

  it("dedupes duplicate pool rows and keeps canonical pool href", () => {
    render(
      <MyPoolsTab
        pools={[
          { id: "pool-1", name: "NBA Finals Pool", href: "/brackets/leagues/pool-1", members: 4, entries: 12, sport: "NBA" },
          { id: "pool-1", name: "Duplicate", href: "/league/pool-1", members: 1, entries: 1, sport: "NBA" },
        ]}
      />
    )

    expect(screen.getAllByRole("link", { name: "NBA Finals Pool" })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "NBA Finals Pool" })).toHaveAttribute("href", "/brackets/leagues/pool-1")
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })

  it("routes NBA pool href to /brackets/leagues/[id]", () => {
    render(
      <MyPoolsTab
        pools={[
          { id: "nba-league-1", name: "NBA Bracket", href: "/league/nba-league-1", members: 8, entries: 20, sport: "NBA" },
        ]}
      />
    )

    const link = screen.getByRole("link", { name: "NBA Bracket" })
    expect(link).toHaveAttribute("href", "/brackets/leagues/nba-league-1")
  })

  it("routes NHL pool href to /brackets/leagues/[id]", () => {
    render(
      <MyPoolsTab
        pools={[
          { id: "nhl-league-1", name: "NHL Bracket", href: "/league/nhl-league-1", members: 6, entries: 15, sport: "NHL" },
        ]}
      />
    )

    const link = screen.getByRole("link", { name: "NHL Bracket" })
    expect(link).toHaveAttribute("href", "/brackets/leagues/nhl-league-1")
  })

  it("routes Soccer pool href to /brackets/leagues/[id]", () => {
    render(
      <MyPoolsTab
        pools={[
          { id: "soccer-league-1", name: "World Cup Bracket", href: "/league/soccer-league-1", members: 5, entries: 10, sport: "SOCCER" },
        ]}
      />
    )

    const link = screen.getByRole("link", { name: "World Cup Bracket" })
    expect(link).toHaveAttribute("href", "/brackets/leagues/soccer-league-1")
  })

  it("defaults unknown bracket pool href to /brackets/leagues/[id]", () => {
    render(
      <MyPoolsTab
        pools={[
          { id: "unknown-league-1", name: "Unknown Bracket Pool", href: "/league/unknown-league-1", members: 3, entries: 5, sport: "UNKNOWN" },
        ]}
      />
    )

    const link = screen.getByRole("link", { name: "Unknown Bracket Pool" })
    expect(link).toHaveAttribute("href", "/brackets/leagues/unknown-league-1")
  })

  it("ensures no bracket pool href starts with /league/", () => {
    render(
      <MyPoolsTab
        pools={[
          { id: "pool-1", name: "NBA", href: "/league/pool-1", sport: "NBA" },
          { id: "pool-2", name: "NHL", href: "/league/pool-2", sport: "NHL" },
          { id: "pool-3", name: "Soccer", href: "/league/pool-3", sport: "SOCCER" },
          { id: "pool-4", name: "Unknown", href: "/league/pool-4", sport: null },
        ]}
      />
    )

    for (const name of ["NBA", "NHL", "Soccer", "Unknown"]) {
      const link = screen.getByRole("link", { name })
      const href = link.getAttribute("href") ?? ""
      expect(href.startsWith("/league/")).toBe(false)
      expect(href).toMatch(/^\/brackets\/leagues\//)
    }
  })

  it("renders empty state", () => {
    render(<MyPoolsTab pools={[]} />)
    expect(screen.getByText("No pools yet. Create or join a pool to get started.")).toBeInTheDocument()
  })
})
