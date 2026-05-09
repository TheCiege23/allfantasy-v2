import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

describe("World Cup discover UI modules", () => {
  it("loads discover client", async () => {
    const m = await import("@/components/brackets/world-cup/WorldCupDiscoverClient")
    expect(m.default).toBeDefined()
  })

  it("loads invite join panel", async () => {
    const m = await import("@/components/brackets/world-cup/WorldCupInviteJoinPanel")
    expect(m.default).toBeDefined()
  })

  it("loads discover card", async () => {
    const m = await import("@/components/brackets/world-cup/WorldCupDiscoverCard")
    expect(m.default).toBeDefined()
  })

  it("renders discover card inside narrow container", async () => {
    const WorldCupDiscoverCard = (await import("@/components/brackets/world-cup/WorldCupDiscoverCard")).default
    render(
      <div className="max-w-[360px] overflow-hidden" data-testid="narrow-mobile-column">
        <WorldCupDiscoverCard
          card={{
            id: "c1",
            name: "Test Pool",
            seasonYear: 2026,
            status: "open",
            participantCount: 3,
            maxParticipants: 50,
            joinBlockedReason: null,
            requiresJoinPassword: false,
            poolLocked: false,
          }}
          onJoin={() => {}}
        />
      </div>
    )
    expect(screen.getByTestId("narrow-mobile-column")).toBeInTheDocument()
    expect(screen.getByTestId("world-cup-discover-card-c1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Join$/ })).toBeInTheDocument()
  })
})
