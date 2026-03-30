"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePostPurchaseSync } from "@/hooks/usePostPurchaseSync";
import { TokenBalanceWidget } from "@/components/tokens/TokenBalanceWidget";
import { resolveCheckoutUrl } from "@/lib/monetization/checkout-client";
import { MonetizationComplianceNotice } from "@/components/monetization/MonetizationComplianceNotice";
import { AFProPlanSpotlight } from "@/components/monetization/AFProPlanSpotlight";
import { AFWarRoomPlanSpotlight } from "@/components/monetization/AFWarRoomPlanSpotlight";
import { AFAllAccessBundleSpotlight } from "@/components/monetization/AFAllAccessBundleSpotlight";
import {
  resolvePlanTierFromSku,
  trackMonetizationPageVisited,
  trackPlanCheckoutClicked,
  trackTokenPurchaseClicked,
  trackUpgradeEntryClicked,
} from "@/lib/monetization-analytics";

export type PlanFamily = "af_pro" | "af_commissioner" | "af_war_room" | "af_all_access";

type CatalogItem = {
  sku: string;
  type: "subscription" | "token_pack";
  title: string;
  description: string;
  amountUsd: number;
  currency: "usd";
  interval: "month" | "year" | null;
  tokenAmount: number | null;
  planFamily: PlanFamily | null;
  stripePriceConfigured: boolean;
  checkoutProvider: "stripe_checkout_link";
};

type CatalogPayload = {
  catalog: {
    subscriptions: CatalogItem[];
    tokenPacks: CatalogItem[];
    all: CatalogItem[];
  };
  fancredBoundary: {
    version: string;
    short: string;
    long: string;
    checklist: readonly string[];
  };
};

const CATALOG_CACHE_KEY = "af:monetization:catalog:v1";
const CATALOG_CACHE_TTL_MS = 5 * 60_000;

type CatalogCacheEnvelope = {
  cachedAt: number;
  payload: CatalogPayload;
};

function readCatalogCache(): CatalogPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogPayload | CatalogCacheEnvelope;
    if (!parsed) return null;

    if ("payload" in parsed && "cachedAt" in parsed) {
      const ageMs = Date.now() - Number(parsed.cachedAt || 0);
      if (ageMs > CATALOG_CACHE_TTL_MS) {
        window.sessionStorage.removeItem(CATALOG_CACHE_KEY);
        return null;
      }
      return parsed.payload;
    }

    // Backward compatibility for older cache shape.
    return parsed as CatalogPayload;
  } catch {
    return null;
  }
}

function writeCatalogCache(payload: CatalogPayload): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CatalogCacheEnvelope = {
      cachedAt: Date.now(),
      payload,
    };
    window.sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // best-effort client cache only
  }
}

const PLAN_FAMILY_ORDER: PlanFamily[] = ["af_pro", "af_commissioner", "af_war_room", "af_all_access"];

const PLAN_FAMILY_LABELS: Record<PlanFamily, string> = {
  af_pro: "AF Pro",
  af_commissioner: "AF Commissioner",
  af_war_room: "AF War Room",
  af_all_access: "AF All-Access",
};

const PLAN_FAMILY_EXPLANATIONS: Record<PlanFamily, string> = {
  af_pro: "Player-specific AI tools for trade analysis, waivers, matchups, and player workflows.",
  af_commissioner:
    "League-specific commissioner tools for governance, automations, and advanced oversight.",
  af_war_room: "Draft and long-term planning tools for deeper roster and multi-season strategy.",
  af_all_access: "Combined access across AF Pro, AF Commissioner, and AF War Room workflows.",
};

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function normalizePlanFamilyInput(input: string | null | undefined): PlanFamily | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (value === "af_pro" || value === "pro") return "af_pro";
  if (value === "af_commissioner" || value === "commissioner") return "af_commissioner";
  if (value === "af_war_room" || value === "war_room") return "af_war_room";
  if (value === "af_all_access" || value === "all_access") return "af_all_access";
  return null;
}

export default function MonetizationPurchaseSurface({
  pagePath,
  title,
  subtitle,
  focusPlanFamily = null,
}: {
  pagePath: string;
  title: string;
  subtitle: string;
  focusPlanFamily?: PlanFamily | null;
}) {
  const [payload, setPayload] = useState<CatalogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const didTrackPageVisit = useRef(false);

  const postPurchaseSync = usePostPurchaseSync({
    successMessage: "Purchase complete. We refreshed your access and token balance.",
  });

  useEffect(() => {
    let cancelled = false;
    const cached = readCatalogCache();
    if (cached) {
      setPayload(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch("/api/monetization/catalog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load catalog (${response.status})`);
        }
        return (await response.json()) as CatalogPayload;
      })
      .then((json) => {
        if (cancelled) return;
        setPayload(json);
        writeCatalogCache(json);
        setLoadError(null);
      })
      .catch(() => {
        if (cancelled) return;
        if (!cached) {
          setLoadError("Pricing is temporarily unavailable. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const plansByFamily = useMemo(() => {
    const map = new Map<PlanFamily, { monthly: CatalogItem | null; yearly: CatalogItem | null }>();
    for (const family of PLAN_FAMILY_ORDER) {
      map.set(family, { monthly: null, yearly: null });
    }
    for (const item of payload?.catalog.subscriptions ?? []) {
      if (!item.planFamily || !map.has(item.planFamily)) continue;
      const bucket = map.get(item.planFamily);
      if (!bucket) continue;
      if (item.interval === "month") bucket.monthly = item;
      if (item.interval === "year") bucket.yearly = item;
    }
    return map;
  }, [payload]);

  const orderedFamilies = useMemo(() => {
    if (!focusPlanFamily) return PLAN_FAMILY_ORDER;
    return [focusPlanFamily, ...PLAN_FAMILY_ORDER.filter((family) => family !== focusPlanFamily)];
  }, [focusPlanFamily]);

  const itemBySku = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    for (const item of payload?.catalog.all ?? []) {
      map.set(item.sku, item);
    }
    return map;
  }, [payload?.catalog.all]);

  useEffect(() => {
    if (didTrackPageVisit.current) return;
    didTrackPageVisit.current = true;
    trackMonetizationPageVisited({
      pagePath,
      surface: "monetization_purchase_surface",
      focusPlanTier: focusPlanFamily ? resolvePlanTierFromSku(focusPlanFamily) : "unknown",
    });
  }, [focusPlanFamily, pagePath]);

  async function startCheckout(productType: "subscription" | "token_pack", sku: string) {
    setCheckoutError(null);
    setPendingSku(sku);
    const item = itemBySku.get(sku);
    if (productType === "subscription" && item) {
      const interval = item.interval === "year" ? "year" : "month";
      trackPlanCheckoutClicked({
        sku,
        planTier: resolvePlanTierFromSku(item.planFamily ?? sku),
        interval,
        surface: "pricing_plan_card",
        pagePath,
      });
    } else if (productType === "token_pack") {
      trackTokenPurchaseClicked({
        sku,
        surface: "pricing_token_pack_card",
        pagePath,
      });
    }
    const result = await resolveCheckoutUrl({ sku, productType, returnPath: pagePath });
    if (!result.ok) {
      setCheckoutError(result.error);
      setPendingSku(null);
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[160px]" />
        <div className="absolute top-52 -left-56 h-[520px] w-[520px] rounded-full bg-fuchsia-500/7 blur-[180px]" />
        <div className="absolute -bottom-64 right-0 h-[560px] w-[560px] rounded-full bg-indigo-500/9 blur-[190px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 sm:mb-8">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white/50 transition hover:text-white/80"
          >
            <span aria-hidden>&larr;</span> Back to Home
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href="/pricing" className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-white/80 hover:bg-white/[0.08]">
              Pricing
            </Link>
            <Link href="/tokens" className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-white/80 hover:bg-white/[0.08]">
              Tokens
            </Link>
          </div>
        </div>

        <div className="mb-6 text-center sm:mb-8">
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-white/55 sm:text-base">{subtitle}</p>
        </div>
        {postPurchaseSync.state.phase !== "idle" ? (
          <section
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              postPurchaseSync.state.phase === "success"
                ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
                : postPurchaseSync.state.phase === "cancelled"
                  ? "border-amber-300/35 bg-amber-500/10 text-amber-100"
                  : postPurchaseSync.state.phase === "failed"
                    ? "border-red-400/35 bg-red-500/10 text-red-100"
                    : "border-cyan-300/35 bg-cyan-500/10 text-cyan-100"
            }`}
            data-testid="post-purchase-sync-banner"
          >
            <p data-testid="post-purchase-sync-status">{postPurchaseSync.state.message}</p>
            {(postPurchaseSync.state.phase === "pending" ||
              postPurchaseSync.state.phase === "failed") ? (
              <button
                type="button"
                onClick={() => void postPurchaseSync.retrySync()}
                disabled={postPurchaseSync.isSyncing}
                className="mt-2 min-h-[40px] rounded-lg border border-white/25 bg-black/25 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="post-purchase-sync-retry"
              >
                {postPurchaseSync.isSyncing ? "Refreshing..." : "Refresh access now"}
              </button>
            ) : null}
          </section>
        ) : null}

        {focusPlanFamily === "af_pro" ? (
          <AFProPlanSpotlight className="mb-4" />
        ) : null}
        {focusPlanFamily === "af_war_room" ? (
          <AFWarRoomPlanSpotlight className="mb-4" />
        ) : null}
        {focusPlanFamily === "af_all_access" ? (
          <AFAllAccessBundleSpotlight className="mb-4" />
        ) : null}

        <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid="monetization-plan-explanations">
          <h2 className="text-xs uppercase tracking-[0.16em] text-cyan-300/80">What each plan includes</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PLAN_FAMILY_ORDER.map((family) => (
              <article
                key={family}
                className="rounded-lg border border-white/10 bg-black/20 p-3"
                data-testid={`pricing-plan-summary-${family}`}
              >
                <p className="text-sm font-semibold text-white">{PLAN_FAMILY_LABELS[family]}</p>
                <p className="mt-1 text-xs text-white/65">{PLAN_FAMILY_EXPLANATIONS[family]}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/60" data-testid="pricing-token-model-copy">
            Tokens provide pay-per-use access. Different features cost different token amounts based on complexity.
          </p>
        </section>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">AF Free</div>
          <div className="mt-2 text-2xl font-black">
            $0 <span className="text-sm font-medium text-white/60">/forever</span>
          </div>
          <p className="mt-2 text-sm text-white/65">League creation and league management are free.</p>
        </div>
        <div className="mb-4">
          <TokenBalanceWidget />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
            Loading pricing catalog...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {loadError}
          </div>
        ) : (
          <>
            {checkoutError ? (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {checkoutError}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {orderedFamilies.map((family) => {
                const plan = plansByFamily.get(family);
                if (!plan) return null;
                const monthly = plan.monthly;
                const yearly = plan.yearly;
                if (!monthly && !yearly) return null;
                const primary = monthly ?? yearly;
                if (!primary) return null;
                const focused = family === focusPlanFamily;
                return (
                  <article
                    key={family}
                    className={`rounded-2xl border bg-gradient-to-br from-[#0a0f1d] via-[#0b1326] to-[#080d19] p-4 ${
                      focused ? "border-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]" : "border-white/10"
                    }`}
                    data-testid={`pricing-plan-card-${family}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">
                        {PLAN_FAMILY_LABELS[family]}
                      </div>
                      {focused ? (
                        <span className="rounded-full border border-cyan-300/35 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {primary.title.replace(" Monthly", "").replace(" Yearly", "")}
                    </h2>
                    <p className="mt-1 text-sm text-white/60">{primary.description}</p>
                    {focused && focusPlanFamily !== "af_all_access" ? (
                      <Link
                        href="/all-access"
                        onClick={() =>
                          trackUpgradeEntryClicked({
                            targetPlan: "all_access",
                            sourcePlan: resolvePlanTierFromSku(family),
                            surface: "pricing_cross_upgrade_link",
                            pagePath,
                          })
                        }
                        className="mt-2 inline-flex rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20"
                        data-testid={`pricing-cross-upgrade-all-access-${family}`}
                      >
                        Prefer one bundle? Get AF All-Access
                      </Link>
                    ) : null}
                    <div className="mt-3 space-y-1 text-sm">
                      {monthly ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                          <div className="flex items-center justify-between text-white/85">
                            <span>Monthly</span>
                            <span className="font-semibold">{formatUsd(monthly.amountUsd)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startCheckout("subscription", monthly.sku)}
                            disabled={pendingSku != null || !monthly.stripePriceConfigured}
                            className="mt-2 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                            data-testid={`pricing-subscription-cta-${monthly.sku}`}
                          >
                            {pendingSku === monthly.sku ? "Starting checkout..." : "Checkout monthly"}
                          </button>
                        </div>
                      ) : null}
                      {yearly ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                          <div className="flex items-center justify-between text-white/85">
                            <span>Yearly</span>
                            <span className="font-semibold">{formatUsd(yearly.amountUsd)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startCheckout("subscription", yearly.sku)}
                            disabled={pendingSku != null || !yearly.stripePriceConfigured}
                            className="mt-2 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                            data-testid={`pricing-subscription-cta-${yearly.sku}`}
                          >
                            {pendingSku === yearly.sku ? "Starting checkout..." : "Checkout yearly"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[11px] text-white/50">
                      Stripe setup: {primary.stripePriceConfigured ? "configured" : "pending"}
                    </p>
                  </article>
                );
              })}
            </div>

            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">AI Token Packs</h2>
              <p className="mt-1 text-xs text-white/55">
                Pay only for the AI actions you use. Feature costs vary by token amount.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(payload?.catalog.tokenPacks ?? []).map((pack) => (
                  <article key={pack.sku} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="text-sm font-semibold text-white">{pack.title}</h3>
                    <p className="mt-1 text-xs text-white/60">{pack.description}</p>
                    <div className="mt-2 text-lg font-bold text-cyan-300">{formatUsd(pack.amountUsd)}</div>
                    <button
                      type="button"
                      onClick={() => startCheckout("token_pack", pack.sku)}
                      disabled={pendingSku != null || !pack.stripePriceConfigured}
                      className="mt-3 min-h-[40px] w-full rounded-lg bg-cyan-500/85 px-3 py-2 text-xs font-semibold text-[#041322] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                      data-testid={`pricing-token-cta-${pack.sku}`}
                    >
                      {pendingSku === pack.sku ? "Starting checkout..." : "Buy token pack"}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-6">
              <MonetizationComplianceNotice fancredCopy={payload?.fancredBoundary} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
