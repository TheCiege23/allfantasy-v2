import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import { CheckoutCoveragePanel } from "@/components/admin/CheckoutCoveragePanel"

const fetchMock = vi.fn()

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function errResponse(status: number, body: unknown) {
  return { ok: false, status, json: async () => body }
}

const ALL_CONFIGURED_DATA = {
  summary: { totalProducts: 2, configuredProducts: 2, missingProducts: 0 },
  missingSkus: [],
  products: [
    {
      sku: "af_pro_monthly",
      title: "AF Pro Monthly",
      checkoutConfigured: true,
      expectedPurchaseType: "subscription" as const,
      mappedPurchaseType: "subscription",
      checkoutDestination: "https://buy.stripe.com/test_pro",
      issue: null,
    },
    {
      sku: "af_tokens_10",
      title: "AllFantasy AI Tokens (600)",
      checkoutConfigured: true,
      expectedPurchaseType: "tokens" as const,
      mappedPurchaseType: "tokens",
      checkoutDestination: "https://buy.stripe.com/test_tokens",
      issue: null,
    },
  ],
}

const PARTIAL_DATA = {
  summary: { totalProducts: 2, configuredProducts: 1, missingProducts: 1 },
  missingSkus: ["af_tokens_10"],
  products: [
    {
      sku: "af_pro_monthly",
      title: "AF Pro Monthly",
      checkoutConfigured: true,
      expectedPurchaseType: "subscription" as const,
      mappedPurchaseType: "subscription",
      checkoutDestination: "https://buy.stripe.com/test_pro",
      issue: null,
    },
    {
      sku: "af_tokens_10",
      title: "AllFantasy AI Tokens (600)",
      checkoutConfigured: false,
      expectedPurchaseType: "tokens" as const,
      mappedPurchaseType: "tokens",
      checkoutDestination: null,
      issue: "checkout_link_missing_or_invalid",
    },
  ],
}

describe("CheckoutCoveragePanel", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // -------------------------------------------------------------------------
  // 1. Auth / access denied
  // -------------------------------------------------------------------------
  it("shows access denied message on 401", async () => {
    fetchMock.mockResolvedValueOnce(
      errResponse(401, { error: "Unauthorized" })
    )

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-error")).toHaveTextContent(
        "Admin account required to view checkout coverage"
      )
    })

    expect(screen.queryByTestId("checkout-coverage-status-banner")).toBeNull()
  })

  it("shows access denied message on 403", async () => {
    fetchMock.mockResolvedValueOnce(
      errResponse(403, { error: "Forbidden" })
    )

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-error")).toHaveTextContent(
        "Admin account required to view checkout coverage"
      )
    })
  })

  // -------------------------------------------------------------------------
  // 2. All configured — green banner
  // -------------------------------------------------------------------------
  it("shows green status banner when all checkout links are configured", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(ALL_CONFIGURED_DATA))

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-status-banner")).toHaveTextContent(
        "All checkout links configured"
      )
    })

    // No missing list shown when everything is ok
    expect(screen.queryByTestId("checkout-coverage-missing-list")).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 3. Partial coverage — amber banner + missing list
  // -------------------------------------------------------------------------
  it("shows amber banner and missing SKU list when some links are absent", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(PARTIAL_DATA))

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-status-banner")).toHaveTextContent(
        "1 SKU missing checkout links"
      )
    })

    const missingList = screen.getByTestId("checkout-coverage-missing-list")
    expect(missingList).toBeInTheDocument()
    expect(missingList).toHaveTextContent("AllFantasy AI Tokens (600)")
    expect(missingList).toHaveTextContent("af_tokens_10")
    expect(missingList).toHaveTextContent("checkout link missing or invalid")
  })

  // -------------------------------------------------------------------------
  // 4. API network error
  // -------------------------------------------------------------------------
  it("shows error message on fetch network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network timeout"))

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-error")).toHaveTextContent(
        "network timeout"
      )
    })
  })

  // -------------------------------------------------------------------------
  // 5. Refresh button re-fetches
  // -------------------------------------------------------------------------
  it("re-fetches on refresh button click", async () => {
    fetchMock.mockResolvedValue(okResponse(ALL_CONFIGURED_DATA))

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-status-banner")).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId("checkout-coverage-refresh"))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    expect(fetchMock.mock.calls[1][0]).toContain(
      "/api/admin/monetization/checkout-link-mapping"
    )
  })

  // -------------------------------------------------------------------------
  // 6. "Show all products" toggle expands the table
  // -------------------------------------------------------------------------
  it("expands product table on toggle click", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(ALL_CONFIGURED_DATA))

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(screen.getByTestId("checkout-coverage-toggle-all")).toBeInTheDocument()
    })

    // Table not visible initially
    expect(screen.queryByText("AF Pro Monthly")).toBeNull()

    fireEvent.click(screen.getByTestId("checkout-coverage-toggle-all"))

    await waitFor(() => {
      expect(screen.getByText("AF Pro Monthly")).toBeInTheDocument()
    })
    expect(screen.getByText("AllFantasy AI Tokens (600)")).toBeInTheDocument()

    // Clicking again collapses
    fireEvent.click(screen.getByTestId("checkout-coverage-toggle-all"))

    await waitFor(() => {
      expect(screen.queryByText("AF Pro Monthly")).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // 7. Correct API endpoint called
  // -------------------------------------------------------------------------
  it("fetches the correct admin monetization endpoint", async () => {
    fetchMock.mockResolvedValueOnce(okResponse(ALL_CONFIGURED_DATA))

    render(React.createElement(CheckoutCoveragePanel))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce()
    })

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/admin/monetization/checkout-link-mapping"
    )
  })
})
