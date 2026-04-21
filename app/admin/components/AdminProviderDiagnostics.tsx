"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type ClearSportsHistoryRow = NonNullable<ProviderDiagnosticsPayload["clearSportsSyncHistory"]>[number];

type ClearSportsHistoryGroup = {
  id: string;
  entityFamily: string;
  season: string;
  sportLabel: string;
  latestAt: number;
  totalImported: number;
  totalCacheWrites: number;
  totalErrors: number;
  errorCount: number;
  rows: ClearSportsHistoryRow[];
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const historyFiltersHydratedRef = useRef(false);

  const [data, setData] = useState<ProviderDiagnosticsPayload | null>(null);
  const [draftAutomation, setDraftAutomation] = useState<DraftAutomationDiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [importRunning, setImportRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [draftAutomationError, setDraftAutomationError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [failuresOpen, setFailuresOpen] = useState(false);
  const [fallbacksOpen, setFallbacksOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState<Set<string>>(new Set());
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "errors" | "clean">("all");
  const [historySeasonFilter, setHistorySeasonFilter] = useState<string>("all");
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    const rawStatus = searchParams?.get("csHistoryStatus");
    const status = rawStatus === "errors" || rawStatus === "clean" ? rawStatus : "all";
    const season = searchParams?.get("csHistorySeason") || "all";
    const query = searchParams?.get("csHistoryQuery") || "";

    setHistoryStatusFilter((prev) => (prev === status ? prev : status));
    setHistorySeasonFilter((prev) => (prev === season ? prev : season));
    setHistorySearch((prev) => (prev === query ? prev : query));

    historyFiltersHydratedRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!historyFiltersHydratedRef.current) return;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmedQuery = historySearch.trim();

    if (historyStatusFilter === "all") params.delete("csHistoryStatus");
    else params.set("csHistoryStatus", historyStatusFilter);

    if (historySeasonFilter === "all") params.delete("csHistorySeason");
    else params.set("csHistorySeason", historySeasonFilter);

    if (!trimmedQuery) params.delete("csHistoryQuery");
    else params.set("csHistoryQuery", trimmedQuery);

    const nextQuery = params.toString();
    const currentQuery = searchParams?.toString() ?? "";
    if (nextQuery === currentQuery) return;

    const basePath = pathname ?? "/admin";

    router.replace(nextQuery ? `${basePath}?${nextQuery}` : basePath, { scroll: false });
  }, [historySearch, historySeasonFilter, historyStatusFilter, pathname, router, searchParams]);

  const clearSportsHistoryGroups = useMemo<ClearSportsHistoryGroup[]>(() => {
    const rows = data?.clearSportsSyncHistory ?? [];
    const groups = new Map<string, {
      entityFamily: string;
      season: string;
      sports: Set<string>;
      latestAt: number;
      totalImported: number;
      totalCacheWrites: number;
      totalErrors: number;
      errorCount: number;
      rows: ClearSportsHistoryRow[];
    }>();

    for (const row of rows) {
      const entityFamily = row.entityType.split(":")[0] || row.entityType;
      const season = row.key || "-";
      const sport = row.sport || "GLOBAL";
      const groupId = `${entityFamily}::${season}`;

      const current = groups.get(groupId) ?? {
        entityFamily,
        season,
        sports: new Set<string>(),
        latestAt: 0,
        totalImported: 0,
        totalCacheWrites: 0,
        totalErrors: 0,
        errorCount: 0,
        rows: [],
      };

      current.sports.add(sport);
      current.latestAt = Math.max(current.latestAt, row.updatedAt);
      current.totalImported += row.recordsImported;
      current.totalCacheWrites += row.recordsUpdated;
      current.totalErrors += row.recordsSkipped;
      if (row.lastError) current.errorCount += 1;
      current.rows.push(row);
      groups.set(groupId, current);
    }

    return Array.from(groups.entries())
      .map(([id, group]) => ({
        id,
        entityFamily: group.entityFamily,
        season: group.season,
        sportLabel:
          group.sports.size === 1
            ? Array.from(group.sports)[0]
            : `${group.sports.size} sports`,
        latestAt: group.latestAt,
        totalImported: group.totalImported,
        totalCacheWrites: group.totalCacheWrites,
        totalErrors: group.totalErrors,
        errorCount: group.errorCount,
        rows: group.rows.sort((a, b) => b.updatedAt - a.updatedAt),
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [data?.clearSportsSyncHistory]);

  const clearSportsHistorySeasonOptions = useMemo(() => {
    const values = new Set<string>();
    for (const group of clearSportsHistoryGroups) {
      if (group.season && group.season !== "-") values.add(group.season);
    }
    return Array.from(values).sort((a, b) => b.localeCompare(a));
  }, [clearSportsHistoryGroups]);

  const filteredClearSportsHistoryGroups = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return clearSportsHistoryGroups.filter((group) => {
      if (historyStatusFilter === "errors" && group.errorCount === 0) return false;
      if (historyStatusFilter === "clean" && group.errorCount > 0) return false;
      if (historySeasonFilter !== "all" && group.season !== historySeasonFilter) return false;

      if (!query) return true;

      const inHeader =
        group.entityFamily.toLowerCase().includes(query) ||
        group.sportLabel.toLowerCase().includes(query);
      if (inHeader) return true;

      return group.rows.some(
        (row) =>
          row.entityType.toLowerCase().includes(query) ||
          String(row.sport || "GLOBAL").toLowerCase().includes(query) ||
          String(row.lastError || "").toLowerCase().includes(query),
      );
    });
  }, [clearSportsHistoryGroups, historySearch, historySeasonFilter, historyStatusFilter]);

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

  const runClearSportsImport = useCallback(async () => {
    setImportRunning(true);
    setImportMessage(null);
    try {
      const res = await fetch('/api/admin/clearsports/import', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncType: 'all' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'ClearSports import failed');
      }
      const endpointCount = Number(json?.summary?.fetchedEndpoints ?? 0);
      const cacheWrites = Number(json?.summary?.cacheWrites ?? 0);
      setImportMessage(`ClearSports import complete: ${endpointCount} endpoints, ${cacheWrites} cache writes.`);
      await load();
    } catch (e: unknown) {
      setImportMessage(e instanceof Error ? e.message : 'ClearSports import failed');
    } finally {
      setImportRunning(false);
    }
  }, [load]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleHistory = (id: string) => {
    setHistoryExpanded((prev) => {
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runClearSportsImport}
            disabled={loading || importRunning}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Activity className={`h-4 w-4 ${importRunning ? 'animate-pulse' : ''}`} />
            {importRunning ? 'Importing ClearSports…' : 'Run ClearSports Import'}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh status
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          {importMessage}
        </div>
      )}

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
              <span className="text-sm font-semibold text-white/90">ClearSports import history</span>
              <span className="text-xs text-white/50">
                {filteredClearSportsHistoryGroups.length} of {clearSportsHistoryGroups.length} grouped rows
              </span>
            </div>

            {clearSportsHistoryGroups.length > 0 && (
              <div className="grid grid-cols-1 gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3 sm:grid-cols-3">
                <label className="text-xs text-white/70">
                  <span className="mb-1 block text-white/50">Status</span>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value as "all" | "errors" | "clean")}
                    className="h-9 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-xs text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="all">All</option>
                    <option value="errors">Errors only</option>
                    <option value="clean">Clean only</option>
                  </select>
                </label>

                <label className="text-xs text-white/70">
                  <span className="mb-1 block text-white/50">Season</span>
                  <select
                    value={historySeasonFilter}
                    onChange={(e) => setHistorySeasonFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-xs text-white outline-none focus:border-cyan-400/50"
                  >
                    <option value="all">All seasons</option>
                    {clearSportsHistorySeasonOptions.map((season) => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-white/70">
                  <span className="mb-1 block text-white/50">Search</span>
                  <input
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Entity, sport, or error text"
                    className="h-9 w-full rounded-lg border border-white/15 bg-black/30 px-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-cyan-400/50"
                  />
                </label>
              </div>
            )}

            {clearSportsHistoryGroups.length === 0 ? (
              <div className="px-4 py-3 text-xs text-white/50">No ClearSports sync history yet.</div>
            ) : filteredClearSportsHistoryGroups.length === 0 ? (
              <div className="px-4 py-3 text-xs text-white/50">No history rows match the current filters.</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {filteredClearSportsHistoryGroups.map((group) => {
                  const isOpen = historyExpanded.has(group.id);
                  const hasErrors = group.errorCount > 0;

                  return (
                    <li key={group.id}>
                      <button
                        type="button"
                        onClick={() => toggleHistory(group.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white/50 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-white/90">{group.entityFamily}</span>
                          <span className="text-xs rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/65">
                            Season {group.season}
                          </span>
                          <span className="text-xs rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-white/65">
                            {group.sportLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/70">
                          <span>Imported {group.totalImported}</span>
                          <span>Writes {group.totalCacheWrites}</span>
                          <span>Errors {group.totalErrors}</span>
                          <span className="text-white/50">{formatTime(group.latestAt)}</span>
                          {hasErrors ? (
                            <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                              Issues
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                              Clean
                            </span>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pl-10">
                          <div className="overflow-x-auto rounded-lg border border-white/10">
                            <table className="min-w-full divide-y divide-white/10 text-xs">
                              <thead className="bg-white/[0.03] text-white/50 uppercase tracking-wide">
                                <tr>
                                  <th className="px-3 py-2 text-left">Entity</th>
                                  <th className="px-3 py-2 text-left">Sport</th>
                                  <th className="px-3 py-2 text-left">Updated</th>
                                  <th className="px-3 py-2 text-left">Imported</th>
                                  <th className="px-3 py-2 text-left">Writes</th>
                                  <th className="px-3 py-2 text-left">Errors</th>
                                  <th className="px-3 py-2 text-left">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-white/75">
                                {group.rows.map((row, index) => {
                                  const hasError = Boolean(row.lastError);
                                  return (
                                    <tr key={`${group.id}-${row.entityType}-${index}`} className="align-top">
                                      <td className="px-3 py-2 font-medium text-white/90">{row.entityType}</td>
                                      <td className="px-3 py-2 text-white/60">{row.sport || "GLOBAL"}</td>
                                      <td className="px-3 py-2 text-white/60">{formatTime(row.updatedAt)}</td>
                                      <td className="px-3 py-2">{row.recordsImported}</td>
                                      <td className="px-3 py-2">{row.recordsUpdated}</td>
                                      <td className="px-3 py-2">{row.recordsSkipped}</td>
                                      <td className="px-3 py-2">
                                        {hasError ? (
                                          <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                                            Error
                                          </span>
                                        ) : (
                                          <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                                            Success
                                          </span>
                                        )}
                                        {hasError && (
                                          <p className="mt-1 max-w-[360px] truncate text-[11px] text-red-200/80" title={row.lastError || undefined}>
                                            {row.lastError}
                                          </p>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
