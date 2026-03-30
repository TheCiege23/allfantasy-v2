"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Activity,
  ShieldAlert,
} from "lucide-react";
import type {
  ProviderDiagnosticsPayload,
  ProviderDiagnosticsEntry,
  ProviderStatusState,
} from "@/lib/provider-diagnostics";
import AdminCheckoutLinkMappingPanel from "./AdminCheckoutLinkMappingPanel";

type DraftAutomationMatrixEntry = {
  feature: string;
  lane: "deterministic_required" | "rules_engine" | "scheduled_cached" | "ai_optional" | string;
  aiOptional: boolean;
  description: string;
};

type DraftAutomationDiagnosticsPayload = {
  generatedAt: string;
  providerStatus: {
    openai: boolean;
    deepseek: boolean;
    xai: boolean;
    clearsports: boolean;
    anyAi: boolean;
  };
  usage24h: {
    draftCalls: number;
    draftErrors: number;
    draftAiCalls: number;
    deterministicSharePct: number;
  } | null;
  executionMatrix: DraftAutomationMatrixEntry[];
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  xai: "xAI (Grok)",
  grok: "xAI (Grok)",
  clearsports: "ClearSports",
};

function laneLabel(lane: string) {
  if (lane === "deterministic_required") return "Deterministic";
  if (lane === "rules_engine") return "Rules engine";
  if (lane === "scheduled_cached") return "Scheduled/cache";
  if (lane === "ai_optional") return "AI optional";
  return lane.replaceAll("_", " ");
}

function laneClassName(lane: string) {
  if (lane === "deterministic_required") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (lane === "rules_engine") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  if (lane === "scheduled_cached") return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
  if (lane === "ai_optional") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  return "border-white/20 bg-white/5 text-white/70";
}

function formatFeatureName(feature: string) {
  return feature
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatusBadge({ state }: { state: ProviderStatusState }) {
  const configs: Record<
    ProviderStatusState,
    { label: string; className: string; icon: typeof CheckCircle }
  > = {
    configured: {
      label: "Configured",
      className: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      icon: Zap,
    },
    available: {
      label: "Available",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: CheckCircle,
    },
    degraded: {
      label: "Degraded",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: AlertTriangle,
    },
    unavailable: {
      label: "Unavailable",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: XCircle,
    },
    fallback_active: {
      label: "Fallback active",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: ShieldAlert,
    },
  };
  const c = configs[state] ?? configs.unavailable;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${c.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {c.label}
    </span>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatLatencyTrend(trend: string) {
  if (trend === "critical") return "Critical";
  if (trend === "elevated") return "Elevated";
  if (trend === "stable") return "Stable";
  return "Unknown";
}

export default function AdminProviderDiagnostics() {
  const [data, setData] = useState<ProviderDiagnosticsPayload | null>(null);
  const [draftAutomation, setDraftAutomation] = useState<DraftAutomationDiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftAutomationError, setDraftAutomationError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [fallbacksOpen, setFallbacksOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDraftAutomationError(null);
    try {
      const [providerRes, draftAutomationRes] = await Promise.all([
        fetch("/api/admin/providers/diagnostics", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/admin/draft-automation/diagnostics", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const providerJson = await providerRes.json().catch(() => ({}));
      if (!providerRes.ok) {
        throw new Error(providerJson?.error || providerJson?.details || "Failed to load provider diagnostics");
      }
      setData(providerJson);

      const draftAutomationJson = await draftAutomationRes.json().catch(() => ({}));
      if (!draftAutomationRes.ok) {
        setDraftAutomation(null);
        setDraftAutomationError(
          draftAutomationJson?.error ||
            draftAutomationJson?.details ||
            "Draft automation diagnostics unavailable"
        );
      } else {
        setDraftAutomation(draftAutomationJson);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostics");
      setData(null);
      setDraftAutomation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white/95">Provider diagnostics</h2>
            <p className="text-xs text-white/50">
              OpenAI, DeepSeek, xAI, ClearSports — availability, failures, fallback
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh status
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!data && !error && loading && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-white/50">
          Loading diagnostics…
        </div>
      )}

      {data && (
        <>
          <AdminCheckoutLinkMappingPanel />

          <section className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="px-4 py-3 border-b border-white/5 bg-white/[0.03]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white/90">Draft automation policy</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Deterministic-first vs AI optional lanes and 24h usage balance
                  </p>
                </div>
                <span className="text-xs text-white/50">
                  {draftAutomation ? `Generated ${formatTime(new Date(draftAutomation.generatedAt).getTime())}` : "Not loaded"}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {draftAutomationError && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {draftAutomationError}
                </div>
              )}

              {draftAutomation?.usage24h && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-white/50">Draft calls (24h)</p>
                    <p className="mt-1 text-lg font-semibold text-white/90">
                      {draftAutomation.usage24h.draftCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3">
                    <p className="text-[11px] text-violet-200/70">AI draft calls (24h)</p>
                    <p className="mt-1 text-lg font-semibold text-violet-200">
                      {draftAutomation.usage24h.draftAiCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-[11px] text-emerald-200/70">Deterministic share</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-200">
                      {draftAutomation.usage24h.deterministicSharePct}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-[11px] text-red-200/70">Draft errors (24h)</p>
                    <p className="mt-1 text-lg font-semibold text-red-200">
                      {draftAutomation.usage24h.draftErrors.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {draftAutomation?.executionMatrix?.length ? (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/[0.03]">
                      <tr className="text-left text-[11px] uppercase tracking-wide text-white/50">
                        <th className="px-3 py-2">Feature</th>
                        <th className="px-3 py-2">Lane</th>
                        <th className="px-3 py-2">AI optional</th>
                        <th className="px-3 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/80">
                      {draftAutomation.executionMatrix.map((entry) => (
                        <tr key={entry.feature} className="align-top">
                          <td className="px-3 py-2 font-medium text-white/90 whitespace-nowrap">
                            {formatFeatureName(entry.feature)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${laneClassName(entry.lane)}`}
                            >
                              {laneLabel(entry.lane)}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${
                                entry.aiOptional
                                  ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                                  : "border-white/20 bg-white/5 text-white/60"
                              }`}
                            >
                              {entry.aiOptional ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-white/65">{entry.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 bg-white/[0.03]">
              <Activity className="h-4 w-4 text-white/50" />
              <span className="text-sm font-semibold text-white/90">Providers</span>
              <span className="text-xs text-white/50 ml-1">
                Generated {formatTime(data.generatedAt)}
              </span>
            </div>
            <ul className="divide-y divide-white/5">
              {data.providers.map((p: ProviderDiagnosticsEntry) => {
                const id = p.id;
                const isExpanded = expanded.has(id);
                const label = PROVIDER_LABELS[id] ?? id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-white/50 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-white/90 capitalize">
                        {label}
                      </span>
                      <StatusBadge state={p.state} />
                      {p.fallbackUsedCount > 0 && (
                        <span className="text-xs text-amber-400">
                          Fallback used {p.fallbackUsedCount}x
                        </span>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 pl-11 space-y-2 text-xs text-white/70">
                        <div className="flex flex-wrap gap-4">
                          <span>Configured: {p.configured ? "Yes" : "No"}</span>
                          <span>Available: {p.available ? "Yes" : "No"}</span>
                          {p.healthy !== undefined && (
                            <span>Healthy: {p.healthy ? "Yes" : "No"}</span>
                          )}
                          {p.lastLatencyMs != null && (
                            <span>Last latency: {p.lastLatencyMs}ms</span>
                          )}
                          {p.avgLatencyMs != null && (
                            <span>Avg latency: {p.avgLatencyMs}ms</span>
                          )}
                          <span>Latency trend: {formatLatencyTrend(p.latencyTrend)}</span>
                          <span>Recent failures (1h): {p.recentFailureCount}</span>
                          {p.lastFailureAt != null && (
                            <span>Last failure: {formatTime(p.lastFailureAt)}</span>
                          )}
                        </div>
                        {p.degradedReasons.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {p.degradedReasons.map((reason) => (
                              <span
                                key={`${id}-${reason}`}
                                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300"
                              >
                                {reason.replaceAll("_", " ")}
                              </span>
                            ))}
                          </div>
                        )}
                        {p.error && (
                          <p className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-200/90">
                            {p.error}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-white/5 bg-white/[0.03]">
              <span className="text-sm font-semibold text-white/90">Degraded mode behavior</span>
              <span
                className={`text-xs px-2 py-1 rounded-full border ${
                  data.degradedMode.active
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {data.degradedMode.active ? "Active recently" : "No recent activation"}
              </span>
            </div>
            {data.degradedMode.recentEvents.length === 0 ? (
              <div className="px-4 py-3 text-xs text-white/50">No degraded-mode activations in recent history.</div>
            ) : (
              <ul className="divide-y divide-white/5 max-h-44 overflow-y-auto">
                {data.degradedMode.recentEvents.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="px-4 py-2 text-xs text-white/70">
                    <span className="text-amber-300">{event.reason.replaceAll("_", " ")}</span>{" "}
                    <span className="text-white/50">{formatTime(event.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setFailuresOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/5"
            >
              <span className="text-sm font-semibold text-white/90">
                Recent failure summary
              </span>
              <span className="text-xs text-white/50">
                {data.recentFailures.length} entries
              </span>
              {failuresOpen ? (
                <ChevronDown className="h-4 w-4 text-white/50" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white/50" />
              )}
            </button>
            {failuresOpen && (
              <ul className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                {data.recentFailures.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-white/50">No recent failures</li>
                ) : (
                  data.recentFailures.map((f, i) => (
                    <li key={i} className="px-4 py-2 text-xs text-white/70">
                      <span className="font-medium text-white/80">
                        {PROVIDER_LABELS[f.provider] ?? f.provider}
                      </span>{" "}
                      {formatTime(f.at)}
                      {f.error && (
                        <span className="block mt-1 text-white/50 truncate">{f.error}</span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setFallbacksOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/5"
            >
              <span className="text-sm font-semibold text-white/90">
                Fallback event summary
              </span>
              <span className="text-xs text-white/50">
                {data.fallbackEvents.length} events
              </span>
              {fallbacksOpen ? (
                <ChevronDown className="h-4 w-4 text-white/50" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white/50" />
              )}
            </button>
            {fallbacksOpen && (
              <ul className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                {data.fallbackEvents.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-white/50">No fallback events</li>
                ) : (
                  data.fallbackEvents.map((e, i) => (
                    <li key={i} className="px-4 py-2 text-xs text-white/70">
                      <span className="text-amber-400/90">Fallback</span>:{" "}
                      {PROVIDER_LABELS[e.primary] ?? e.primary} →{" "}
                      {PROVIDER_LABELS[e.used] ?? e.used}{" "}
                      <span className="text-white/50">{formatTime(e.at)}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
