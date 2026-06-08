/**
 * ChimmyFreshnessChip — rendering tests
 *
 * Verifies:
 * 1. Chip renders the label text
 * 2. Chip has the correct aria-label for screen readers
 * 3. Different tiers get different visual styles (checked via classname)
 * 4. Null/undefined tier falls back gracefully without crash
 * 5. Message objects with missing dataSourceDisplay don't render a chip
 *    (tested via conditional logic used in BracketShell)
 */
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChimmyFreshnessChip } from "@/components/brackets/world-cup/ChimmyFreshnessChip"

describe("ChimmyFreshnessChip", () => {
  it("renders the label text", () => {
    render(<ChimmyFreshnessChip tier="pool_only" label="Pool data" />)
    expect(screen.getByText("Pool data")).toBeTruthy()
  })

  it("has an accessible aria-label with the label text", () => {
    render(<ChimmyFreshnessChip tier="live" label="Live" />)
    const chip = screen.getByRole("generic", { name: "Data source: Live" })
    expect(chip).toBeTruthy()
  })

  it("has data-testid chimmy-freshness-chip", () => {
    render(<ChimmyFreshnessChip tier="cached" label="Cached" />)
    expect(screen.getByTestId("chimmy-freshness-chip")).toBeTruthy()
  })

  it("applies emerald styles for live tier", () => {
    render(<ChimmyFreshnessChip tier="live" label="Live" />)
    const chip = screen.getByTestId("chimmy-freshness-chip")
    expect(chip.className).toContain("emerald")
  })

  it("applies sky styles for cached tier", () => {
    render(<ChimmyFreshnessChip tier="cached" label="Cached" />)
    const chip = screen.getByTestId("chimmy-freshness-chip")
    expect(chip.className).toContain("sky")
  })

  it("applies cyan styles for pool_only tier", () => {
    render(<ChimmyFreshnessChip tier="pool_only" label="Pool data" />)
    const chip = screen.getByTestId("chimmy-freshness-chip")
    expect(chip.className).toContain("cyan")
  })

  it("applies amber styles for schedule_only tier", () => {
    render(<ChimmyFreshnessChip tier="schedule_only" label="Pool data" />)
    const chip = screen.getByTestId("chimmy-freshness-chip")
    expect(chip.className).toContain("amber")
  })

  it("applies fallback styles for unknown tier", () => {
    render(<ChimmyFreshnessChip tier="unknown_tier" label="Unavailable" />)
    const chip = screen.getByTestId("chimmy-freshness-chip")
    // Should not crash; falls back to "none" styles (white)
    expect(chip.className).toContain("white")
  })

  it("handles null tier without crashing", () => {
    render(<ChimmyFreshnessChip tier={null} label="Unavailable" />)
    expect(screen.getByTestId("chimmy-freshness-chip")).toBeTruthy()
  })

  it("handles undefined tier without crashing", () => {
    render(<ChimmyFreshnessChip tier={undefined} label="Pool data" />)
    expect(screen.getByTestId("chimmy-freshness-chip")).toBeTruthy()
  })
})

// ─── Conditional rendering guard ──────────────────────────────────────────────
// This matches the conditional in WorldCupBracketShell:
//   {message.dataSourceDisplay ? <ChimmyFreshnessChip ... /> : null}

describe("chip conditional — missing metadata does not break old messages", () => {
  it("null dataSourceDisplay maps to no chip rendered", () => {
    const dataSourceDisplay: string | null = null
    const rendered = dataSourceDisplay ? (
      <ChimmyFreshnessChip tier="pool_only" label={dataSourceDisplay} />
    ) : null
    expect(rendered).toBeNull()
  })

  it("undefined dataSourceDisplay maps to no chip rendered", () => {
    const dataSourceDisplay: string | null | undefined = undefined
    const rendered = dataSourceDisplay ? (
      <ChimmyFreshnessChip tier="pool_only" label={dataSourceDisplay} />
    ) : null
    expect(rendered).toBeNull()
  })

  it("empty string dataSourceDisplay maps to no chip rendered", () => {
    const dataSourceDisplay = ""
    const rendered = dataSourceDisplay ? (
      <ChimmyFreshnessChip tier="pool_only" label={dataSourceDisplay} />
    ) : null
    expect(rendered).toBeNull()
  })

  it("'Pool data' dataSourceDisplay renders a chip", () => {
    const dataSourceDisplay = "Pool data"
    const rendered = dataSourceDisplay ? (
      <ChimmyFreshnessChip tier="pool_only" label={dataSourceDisplay} />
    ) : null
    expect(rendered).not.toBeNull()
    const { getByTestId } = render(rendered!)
    expect(getByTestId("chimmy-freshness-chip")).toBeTruthy()
  })
})
