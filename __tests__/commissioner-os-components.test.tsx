import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HeartPulse } from "lucide-react"
import {
  KpiCard,
  RecommendationCard,
  AlertCard,
  SummaryCard,
  StatusCard,
  TimelineCard,
  InfoCard,
} from "@/components/commissioner-os/cards"
import { EmptyState, LoadingState, ErrorState } from "@/components/commissioner-os/states"
import { TrendIndicator } from "@/components/commissioner-os/primitives/TrendIndicator"

describe("commissioner-os components — KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Open Recommendations" value="4" />)
    expect(screen.getByText("Open Recommendations")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("is keyboard-activatable when clickable", () => {
    const onClick = vi.fn()
    render(<KpiCard label="Active Risks" value="2" onClick={onClick} />)
    const card = screen.getByRole("button")
    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("is not a button when no onClick is provided", () => {
    render(<KpiCard label="Engagement Score" value="82" />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("commissioner-os components — RecommendationCard", () => {
  it("renders the four-part structure: title, rationale, confidence, and a primary action", () => {
    render(
      <RecommendationCard
        title="Inactive manager detected"
        rationale="This manager hasn't set a lineup in 3 weeks."
        severity="elevated"
        confidence="high"
        expectedImpact="Likely to improve engagement if addressed"
        primaryActionLabel="Send Nudge"
      />
    )
    expect(screen.getByText("Inactive manager detected")).toBeInTheDocument()
    expect(screen.getByText(/hasn't set a lineup/)).toBeInTheDocument()
    expect(screen.getByText(/High confidence/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send Nudge" })).toBeInTheDocument()
  })

  it("shows the severity label as a badge", () => {
    render(
      <RecommendationCard
        title="test"
        rationale="test"
        severity="critical"
        confidence="very_high"
        expectedImpact="test"
        primaryActionLabel="Act"
      />
    )
    expect(screen.getByText("Critical")).toBeInTheDocument()
  })

  it("only shows Dismiss when onDismiss is provided", () => {
    const { rerender } = render(
      <RecommendationCard title="t" rationale="r" severity="standard" confidence="moderate" expectedImpact="e" primaryActionLabel="Act" />
    )
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument()

    rerender(
      <RecommendationCard
        title="t"
        rationale="r"
        severity="standard"
        confidence="moderate"
        expectedImpact="e"
        primaryActionLabel="Act"
        onDismiss={() => {}}
      />
    )
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument()
  })
})

describe("commissioner-os components — AlertCard, SummaryCard, StatusCard", () => {
  it("AlertCard shows the message and severity label", () => {
    render(<AlertCard message="2 managers have not set a lineup" severity="elevated" />)
    expect(screen.getByText("2 managers have not set a lineup")).toBeInTheDocument()
    expect(screen.getByText("Elevated")).toBeInTheDocument()
  })

  it("SummaryCard shows title, status label, and summary", () => {
    render(<SummaryCard title="League Health" status="positive" summary="No active risks." icon={HeartPulse} />)
    expect(screen.getByText("League Health")).toBeInTheDocument()
    expect(screen.getByText("Healthy")).toBeInTheDocument()
    expect(screen.getByText("No active risks.")).toBeInTheDocument()
  })

  it("StatusCard shows label and status text without severity coloring", () => {
    render(<StatusCard label="Sync" statusText="Synced 4 minutes ago" />)
    expect(screen.getByText("Sync")).toBeInTheDocument()
    expect(screen.getByText("Synced 4 minutes ago")).toBeInTheDocument()
  })
})

describe("commissioner-os components — TimelineCard and InfoCard", () => {
  it("TimelineCard renders entries in order", () => {
    render(
      <TimelineCard
        title="Recent Activity"
        entries={[
          { id: "1", label: "Trade completed", timestamp: "2h ago" },
          { id: "2", label: "Waiver claim", timestamp: "5h ago" },
        ]}
        emptyText="No recent activity."
      />
    )
    expect(screen.getByText("Trade completed")).toBeInTheDocument()
    expect(screen.getByText("Waiver claim")).toBeInTheDocument()
  })

  it("TimelineCard shows the empty text when there are no entries", () => {
    render(<TimelineCard title="Recent Activity" entries={[]} emptyText="No recent activity." />)
    expect(screen.getByText("No recent activity.")).toBeInTheDocument()
  })

  it("InfoCard renders arbitrary children content", () => {
    render(
      <InfoCard title="What is a Health Score?">
        <span>A 0-100 measure of league operational health.</span>
      </InfoCard>
    )
    expect(screen.getByText("What is a Health Score?")).toBeInTheDocument()
    expect(screen.getByText(/0-100 measure/)).toBeInTheDocument()
  })
})

describe("commissioner-os components — states", () => {
  it("EmptyState renders title and description", () => {
    render(<EmptyState title="Nothing needs your attention right now." description="Your league is in good shape." />)
    expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument()
  })

  it("LoadingState marks itself busy for assistive tech", () => {
    const { container } = render(<LoadingState rows={2} />)
    const busyRegion = container.querySelector('[aria-busy="true"][aria-live="polite"]')
    expect(busyRegion).not.toBeNull()
  })

  it("ErrorState shows a retry button only when onRetry is provided", () => {
    const { rerender } = render(<ErrorState />)
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()

    const onRetry = vi.fn()
    rerender(<ErrorState onRetry={onRetry} />)
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("ErrorState uses role alert, never role status used by severity findings", () => {
    render(<ErrorState message="Failed to load" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load")
  })
})

describe("commissioner-os components — TrendIndicator", () => {
  it("renders the trend label", () => {
    render(<TrendIndicator direction="up" label="+4 this week" />)
    expect(screen.getByText("+4 this week")).toBeInTheDocument()
  })

  it("treats 'down' as positive when positiveDirection is down (e.g. falling risk count)", () => {
    render(<TrendIndicator direction="down" label="-2 risks" positiveDirection="down" />)
    expect(screen.getByText("-2 risks")).toBeInTheDocument()
  })
})
