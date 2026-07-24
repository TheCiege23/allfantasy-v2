import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BetaInvitePanel } from "@/components/admin/BetaInvitePanel"

/**
 * P0-1 admin invitation panel — render + behavior (jsdom).
 *
 * Proves the authenticated-admin invitation UX: issue a non-admin email, see the one-time
 * claim URL exactly once, dismiss it (non-recoverable), filter/list without leaking the raw
 * token or digest, double-submit is guarded, and unauthorized/list-failure states are shown.
 */

const fetchMock = vi.fn()

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response)
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function listOnly(invites: unknown[]) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (!init || init.method === undefined || init.method === "GET") return jsonResponse({ invites })
    return jsonResponse({ invites })
  })
}

describe("BetaInvitePanel", () => {
  it("renders the issue form for an authenticated admin (empty state)", async () => {
    listOnly([])
    render(<BetaInvitePanel />)

    expect(await screen.findByText(/Issue an invitation/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/manager@example.com/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Issue invite/i })).toBeInTheDocument()
    expect(await screen.findByText(/No invitations/i)).toBeInTheDocument()
  })

  it("accepts a non-admin email, shows the one-time claim URL, then hides it on dismiss", async () => {
    let issued = false
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        issued = true
        return jsonResponse({
          id: "inv-1",
          invitedEmail: "prospect@example.com", // NOT an admin — allowed
          claimUrl: "https://preview.example/api/auth/beta/claim?token=ONE-TIME-RAW-XYZ",
          expiresAt: null,
        })
      }
      // list reflects the issued invite but NEVER the raw token/digest
      return jsonResponse({
        invites: issued
          ? [{ id: "inv-1", invitedEmail: "prospect@example.com", status: "pending", note: null, createdByAdmin: "a", createdAt: "2026-07-24T00:00:00Z", expiresAt: null, revokedAt: null, redeemedAt: null, redeemedByUserId: null }]
          : [],
      })
    })

    render(<BetaInvitePanel />)
    fireEvent.change(await screen.findByPlaceholderText(/manager@example.com/i), {
      target: { value: "prospect@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Issue invite/i }))

    // Claim URL shown exactly once, with the unrecoverable warning.
    expect(await screen.findByText(/cannot be recovered/i)).toBeInTheDocument()
    expect(screen.getByText(/ONE-TIME-RAW-XYZ/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Copy$/i })).toBeInTheDocument()

    // Dismiss → the raw URL is gone and cannot be recovered from the list/DOM.
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }))
    await waitFor(() => expect(screen.queryByText(/ONE-TIME-RAW-XYZ/)).not.toBeInTheDocument())
    expect(screen.queryByText(/cannot be recovered/i)).not.toBeInTheDocument()
  })

  it("never renders rawToken or tokenDigest even if the list payload contains them", async () => {
    // Defense-in-depth: the list endpoint should never return these, but if it did, the
    // panel must not surface them.
    listOnly([
      {
        id: "inv-1",
        invitedEmail: "prospect@example.com",
        status: "pending",
        note: null,
        createdByAdmin: "a",
        createdAt: "2026-07-24T00:00:00Z",
        expiresAt: null,
        revokedAt: null,
        redeemedAt: null,
        redeemedByUserId: null,
        // hostile extras that must NOT be rendered
        tokenDigest: "DIGEST-SHOULD-NOT-RENDER",
        rawToken: "RAW-SHOULD-NOT-RENDER",
      },
    ])
    render(<BetaInvitePanel />)

    expect(await screen.findByText("prospect@example.com")).toBeInTheDocument()
    expect(screen.queryByText(/DIGEST-SHOULD-NOT-RENDER/)).not.toBeInTheDocument()
    expect(screen.queryByText(/RAW-SHOULD-NOT-RENDER/)).not.toBeInTheDocument()
  })

  it("guards against double submit (button disabled while issuing)", async () => {
    let resolvePost: (v: unknown) => void = () => {}
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise((r) => (resolvePost = r))
      return jsonResponse({ invites: [] })
    })

    render(<BetaInvitePanel />)
    fireEvent.change(await screen.findByPlaceholderText(/manager@example.com/i), {
      target: { value: "prospect@example.com" },
    })
    const btn = screen.getByRole("button", { name: /Issue invite/i })
    fireEvent.click(btn)

    // While the POST is in flight the button shows "Issuing…" and is disabled.
    expect(await screen.findByRole("button", { name: /Issuing/i })).toBeDisabled()

    resolvePost(jsonResponse({ id: "x", invitedEmail: "prospect@example.com", claimUrl: "u", expiresAt: null }))
    await waitFor(() => expect(screen.getByRole("button", { name: /Issue invite/i })).toBeInTheDocument())
  })

  it("shows an accessible 'Not authorized' state on a 401 list", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ error: "Unauthorized" }, false, 401))
    render(<BetaInvitePanel />)

    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText(/Not authorized/i)).toBeInTheDocument()
  })

  it("revokes an active invite via DELETE with its id", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return jsonResponse({ ok: true })
      return jsonResponse({
        invites: [{ id: "inv-9", invitedEmail: "p@example.com", status: "pending", note: null, createdByAdmin: "a", createdAt: "2026-07-24T00:00:00Z", expiresAt: null, revokedAt: null, redeemedAt: null, redeemedByUserId: null }],
      })
    })

    render(<BetaInvitePanel />)
    // Ensure the row has rendered, then click the row's action button. Exact-anchor the
    // name so it does not match the "revoked" FILTER button.
    expect(await screen.findByText("p@example.com")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /^Revoke$/ }))

    await waitFor(() => {
      const del = fetchMock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "DELETE")
      expect(del).toBeTruthy()
      expect(String(del?.[0])).toContain("id=inv-9")
    })
  })

  it("exposes filter controls for every invitation state", async () => {
    listOnly([])
    render(<BetaInvitePanel />)
    const group = await screen.findByRole("group", { name: /Filter invites/i })
    for (const state of ["all", "active", "expired", "redeemed", "revoked"]) {
      expect(within(group).getByRole("button", { name: new RegExp(`^${state}$`, "i") })).toBeInTheDocument()
    }
  })
})
