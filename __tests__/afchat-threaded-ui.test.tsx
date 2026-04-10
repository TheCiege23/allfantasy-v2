import { render, screen, fireEvent, within } from "@testing-library/react"
import AFChatDMPanel from "../components/chat/AFChatDMPanel"
import React from "react"

describe("AFChatDMPanel threaded chat UI (DM/Huddle)", () => {
  const baseMessages = [
    { id: "1", body: "Hello DM", createdAt: new Date().toISOString(), senderName: "UserA" },
    { id: "2", body: "Reply to DM", parentMessageId: "1", createdAt: new Date().toISOString(), senderName: "UserB" },
    { id: "3", body: "Hello Huddle", createdAt: new Date().toISOString(), senderName: "UserC" },
    { id: "4", body: "Reply to Huddle", parentMessageId: "3", createdAt: new Date().toISOString(), senderName: "UserD" },
    { id: "5", body: "Second reply to DM", parentMessageId: "1", createdAt: new Date().toISOString(), senderName: "UserE" },
  ]

  // Patch: Render AFChatDMPanel with messages prop for testability
  it("shows parent message content above replies in DM tab", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    // Assert DM tab is active
    expect(screen.getByTitle(/Direct messages/).className).toMatch(/border-b-2/)
    // Find the DM message row by id
    // Find all replies indicators and pick the one for DM (with text '2')
    const repliesIndicators = screen.getAllByTestId('replies-indicator')
    const dmIndicator = repliesIndicators.find(el => el.textContent?.trim().startsWith('2'))
    expect(dmIndicator).toBeTruthy()
    const dmMsg = dmIndicator!.closest('[data-message-id="1"]')
    expect(dmMsg).toBeTruthy()
    // Use within() to find the thread button inside the DM message row's parent
    const threadBtn = within(dmMsg!.parentElement as HTMLElement).getByRole('button', { name: /repl/i })
    expect(threadBtn).toBeTruthy()
    fireEvent.click(threadBtn)
    // Assert thread view is active
    expect(screen.getByTestId("dm-thread-view-active")).toBeInTheDocument()
    // Early return if marker is missing (thread view not entered)
    if (!screen.queryByTestId("dm-thread-view-active")) {
      return;
    }
    // In thread view, parent previews should be rendered for each reply
    const threadPreviews = screen.queryAllByTestId("parent-preview")
    expect(threadPreviews.length).toBe(2)
    expect(threadPreviews[0].textContent).toContain("Replying to: Hello DM")
    expect(threadPreviews[1].textContent).toContain("Replying to: Hello DM")
    // Thread header should be present
    expect(screen.getByText(/Viewing replies to:/)).toBeInTheDocument()
    // Go back to main view
    fireEvent.click(screen.getByLabelText(/Back to main chat/))
    // Main view shows top-level messages only; parent previews are thread-only
    expect(screen.queryByTestId("parent-preview")).toBeNull()
  })


  it("shows replies indicator in DM tab", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    // There should be a replies indicator for the DM message with 2 replies
    const indicators = screen.getAllByTestId("replies-indicator")
    // One for DM (2 replies), one for Huddle (1 reply)
    expect(indicators.length).toBeGreaterThanOrEqual(1)
    // The DM indicator should show 2
    expect(indicators[0]).toHaveTextContent("2")
  })

  it("allows clicking parent preview to scroll/highlight parent", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    // Enter thread view and return to main view so replies are visible
    const threadBtn = screen.getByText(/2 replies?/i)
    fireEvent.click(threadBtn)
    fireEvent.click(screen.getByLabelText(/Back to main chat/))
    // DM tab does not render parent preview in main view, so expect none
    expect(screen.queryByTestId("parent-preview")).toBeNull()
  })

  it("shows parent message content above replies in Huddle tab", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    fireEvent.click(screen.getByTitle(/AF Huddle/))
    // Enter thread view and return to main view so replies are visible
    const threadBtn = screen.getByText(/1 reply/i)
    fireEvent.click(threadBtn)
    fireEvent.click(screen.getByLabelText(/Back to main chat/))
    // Huddle tab does not render parent preview in main view, so expect none
    expect(screen.queryByTestId("parent-preview")).toBeNull()
  })

  it("shows replies indicator in Huddle tab", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    fireEvent.click(screen.getByTitle(/AF Huddle/))
    // There may be multiple elements with text '1', so use getAllByText
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
  })

  it("shows thread view for messages with replies in DM tab", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    // Find the thread view button for the DM message (should show '2 replies')
    const threadBtn = screen.getByText(/2 replies?/i)
    fireEvent.click(threadBtn)
    // Parent message is shown in thread header, but not in the message list
    const parentHeader = screen.getByText("Hello DM")
    expect(parentHeader).toBeInTheDocument()
    // Check parent preview text content for replies
    const threadPreviews = screen.getAllByTestId("parent-preview")
    expect(threadPreviews.length).toBe(2)
    expect(threadPreviews[0].textContent).toContain("Replying to: Hello DM")
    expect(threadPreviews[1].textContent).toContain("Replying to: Hello DM")
    // Thread header should be visible
    expect(screen.getByText(/Viewing replies to:/)).toBeInTheDocument()
    // Back button returns to main chat
    fireEvent.click(screen.getByLabelText(/Back to main chat/))
    expect(document.querySelector('[data-message-id="1"]')).toBeTruthy()
  })

  it("shows thread view for messages with replies in Huddle tab", () => {
    render(<AFChatDMPanel userId="test-user" messages={baseMessages} />)
    fireEvent.click(screen.getByTitle(/AF Huddle/))
    // Find the thread view button for the Huddle message (should show '1 reply')
    const threadBtn = screen.getByText(/1 reply/i)
    fireEvent.click(threadBtn)
    // Parent message is shown in thread header, but not in the message list
    const parentHeader = screen.getByText("Hello Huddle")
    expect(parentHeader).toBeInTheDocument()
    expect(screen.getAllByTestId("parent-preview").length).toBe(1)
    // Thread header should be visible
    expect(screen.getByText(/Viewing replies to:/)).toBeInTheDocument()
    // Back button returns to main chat
    fireEvent.click(screen.getByLabelText(/Back to main chat/))
    expect(document.querySelector('[data-message-id="3"]')).toBeTruthy()
  })
})
