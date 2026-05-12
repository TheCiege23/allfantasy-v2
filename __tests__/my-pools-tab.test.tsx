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

  it("renders empty state", () => {
    render(<MyPoolsTab pools={[]} />)
    expect(screen.getByText("No pools yet. Create or join a pool to get started.")).toBeInTheDocument()
  })
})
