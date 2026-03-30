"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";

type MappingIssue =
  | "missing_registry_entry"
  | "purchase_type_mismatch"
  | "checkout_link_missing_or_invalid"
  | null;

type CheckoutLinkMappingProduct = {
  sku: string;
  type: "subscription" | "token_pack";
  title: string;
  amountUsd: number;
  interval: "month" | "year" | null;
  tokenAmount: number | null;
  checkoutLinkEnvVar: string | null;
  expectedPurchaseType: "subscription" | "tokens";
  mappedPurchaseType: "subscription" | "tokens" | null;
  checkoutConfigured: boolean;
  checkoutDestination: string | null;
  issue: MappingIssue;
};

type CheckoutLinkMappingPayload = {
  generatedAt: string;
  summary: {
    totalProducts: number;
    configuredProducts: number;
    missingProducts: number;
  };
  missingSkus: string[];
  products: CheckoutLinkMappingProduct[];
};

function issueLabel(issue: MappingIssue): string {
  if (issue === "missing_registry_entry") return "Missing registry entry";
  if (issue === "purchase_type_mismatch") return "Purchase type mismatch";
  if (issue === "checkout_link_missing_or_invalid") return "Missing/invalid checkout link";
  return "OK";
}

function cadenceLabel(product: CheckoutLinkMappingProduct): string {
  if (product.type === "token_pack") {
    return `${product.tokenAmount ?? 0} tokens`;
  }
  return product.interval === "year" ? "Yearly" : "Monthly";
}

export default function AdminCheckoutLinkMappingPanel() {
  const [data, setData] = useState<CheckoutLinkMappingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/monetization/checkout-link-mapping", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load checkout link mapping");
      }
      setData(json as CheckoutLinkMappingPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load checkout link mapping");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => data?.products ?? [], [data]);
  const missingRows = useMemo(() => rows.filter((row) => row.issue != null), [rows]);

  return (
    <section
      className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]"
      data-testid="admin-checkout-link-mapping-panel"
    >
      <div className="px-4 py-3 border-b border-white/5 bg-white/[0.03] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-cyan-300" />
          <div>
            <h3 className="text-sm font-semibold text-white/90">Monetization checkout-link mapping</h3>
            <p className="text-xs text-white/55">Registry coverage for all plan and token purchase SKUs.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/85 hover:bg-white/10 disabled:opacity-60"
          data-testid="admin-checkout-link-mapping-refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <p className="text-[11px] text-white/55">Total products</p>
              <p className="mt-1 text-lg font-semibold text-white/90 tabular-nums">
                {data.summary.totalProducts}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
              <p className="text-[11px] text-emerald-200/80">Configured</p>
              <p className="mt-1 text-lg font-semibold text-emerald-100 tabular-nums">
                {data.summary.configuredProducts}
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] text-amber-200/85">Missing</p>
              <p className="mt-1 text-lg font-semibold text-amber-100 tabular-nums" data-testid="admin-checkout-link-mapping-missing-count">
                {data.summary.missingProducts}
              </p>
            </div>
          </div>

          {missingRows.length > 0 ? (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Missing checkout mapping for: {missingRows.map((row) => row.sku).join(", ")}
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>All products are mapped to valid Stripe checkout links.</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/[0.03]">
                <tr className="text-left text-[11px] uppercase tracking-wide text-white/50">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Cadence</th>
                  <th className="px-3 py-2">Checkout</th>
                  <th className="px-3 py-2">Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {rows.map((row) => (
                  <tr
                    key={row.sku}
                    className={row.issue ? "bg-red-500/[0.04]" : ""}
                    data-testid={`admin-checkout-link-mapping-row-${row.sku}`}
                  >
                    <td className="px-3 py-2 align-top">
                      <p className="font-medium text-white/90">{row.title}</p>
                      <p className="text-[11px] text-white/50">{row.sku}</p>
                    </td>
                    <td className="px-3 py-2 text-white/75">{cadenceLabel(row)}</td>
                    <td className="px-3 py-2">
                      {row.checkoutConfigured ? (
                        <div>
                          <p className="text-emerald-200">Configured</p>
                          <p className="text-[11px] text-white/50 truncate max-w-[280px]">
                            {row.checkoutDestination || row.checkoutLinkEnvVar || "Configured"}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-amber-200">Missing</p>
                          <p className="text-[11px] text-white/50">{row.checkoutLinkEnvVar || "No env var mapping"}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.issue ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/15 px-2 py-0.5 text-[11px] text-red-200">
                          <XCircle className="h-3 w-3" />
                          {issueLabel(row.issue)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !error && loading ? (
        <div className="p-4 text-xs text-white/60 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-white/50" />
          Loading checkout-link diagnostics...
        </div>
      ) : null}
    </section>
  );
}
