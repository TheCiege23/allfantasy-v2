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
          { id: "pool-1", name: "Duplicate", href: "/brackets/leagues/pool-1", members: 1, entries: 1, sport: "NBA" },
        ]}
      />
    )

    expect(screen.getAllByRole("link", { name: "NBA Finals Pool" })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "NBA Finals Pool" })).toHaveAttribute("href", "/brackets/leagues/pool-1")
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })

  it("renders empty state", () => {
    render(<MyPoolsTab pools={[]} />)
    expect(screen.getByText("No pools yet. Create or join a pool to get started.")).toBeInTheDocument()
  })
})
