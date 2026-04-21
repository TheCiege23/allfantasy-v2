"use client";

import { useCallback, useEffect, useState } from "react";

type ProductInsightsResult = {
  since: string;
  until: string;
  countsByEvent: Array<{ event: string; _count: number }>;
  dailySeries: Array<{ day: string; event: string; count: number }>;
  createLeagueSummary: {
    serverSuccess: number;
    serverFail: number;
    clientSuccess: number;
    clientFail: number;
    funnelOpen: number;
    funnelAbandon: number;
  };
  engagementSummary: {
    draftCompleted: number;
    waiverRuns: number;
    tradesProcessed: number;
    matchupViews: number;
    commissionerSettings: number;
    aiMatchup: number;
    aiStartSit: number;
    joinInviteTeamClaims: number;
    draftRoomStarts: number;
    draftRoomPicks: number;
    draftRoomQueueAdds: number;
    draftRoomChatSends: number;
    draftRoomInviteCopies: number;
    draftRoomCommissionerAutopickLeague: number;
    draftRoomCommissionerForceAutopick: number;
    draftRoomClaimSlots: number;
  };
  engineSampleCounts: Array<{ event: string; _count: number }>;
};

export function ProductTelemetryPanel() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProductInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/product-insights?days=${days}`, { credentials: "include" });
      const json = (await res.json().catch(() => null)) as ProductInsightsResult | { error?: string };
      if (!res.ok) {
        setError((json as { error?: string })?.error ?? "Failed to load");
        setData(null);
        return;
      }
      setData(json as ProductInsightsResult);
    } catch {
      setError("Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.createLeagueSummary;
  const funnelCompletion =
    s && s.funnelOpen > 0 ? Math.round((100 * s.serverSuccess) / s.funnelOpen) : null;

  return (
    <div className="mb-8 rounded-xl border border-white/10 bg-[#0a1228]/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">Product &amp; engagement telemetry</h2>
          <p className="text-sm text-white/55">
            Aggregated from <code className="text-cyan-300/90">AnalyticsEvent</code> (funnel beacons, server confirmations,
            engagement hooks, sampled engine jobs). Use with retention and API usage rollups for full ops picture.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-white/50">
            Window{" "}
            <select
              className="ml-1 rounded-md border border-white/15 bg-[#040915] px-2 py-1.5 text-sm text-white"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {[7, 14, 30, 90, 180].map((d) => (
                <option key={d} value={d}>
                  {d}d
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/90 hover:bg-white/5"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-amber-200/90">{error}</p>}

      {data && s && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="text-xl font-bold tabular-nums text-cyan-200">{s.funnelOpen.toLocaleString()}</div>
              <div className="text-[11px] text-white/50">Funnel opens (wizard)</div>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-xl font-bold tabular-nums text-emerald-200">{s.serverSuccess.toLocaleString()}</div>
              <div className="text-[11px] text-white/50">Leagues created (server)</div>
            </div>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
              <div className="text-xl font-bold tabular-nums text-rose-200">{s.serverFail.toLocaleString()}</div>
              <div className="text-[11px] text-white/50">Create failures (server)</div>
            </div>
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
              <div className="text-xl font-bold tabular-nums text-sky-200">
                {funnelCompletion != null ? `${funnelCompletion}%` : "—"}
              </div>
              <div className="text-[11px] text-white/50">Server success / funnel open</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {(
              [
                ["Drafts completed", data.engagementSummary.draftCompleted],
                ["Waiver runs", data.engagementSummary.waiverRuns],
                ["Trades processed", data.engagementSummary.tradesProcessed],
                ["Matchup views", data.engagementSummary.matchupViews],
                ["Settings saves", data.engagementSummary.commissionerSettings],
                ["AI matchup", data.engagementSummary.aiMatchup],
                ["AI start/sit", data.engagementSummary.aiStartSit],
                ["Join invite claims", data.engagementSummary.joinInviteTeamClaims],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-lg font-semibold tabular-nums text-white">{n.toLocaleString()}</div>
                <div className="text-[11px] text-white/45">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-white/80">Live draft room (client beacons)</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
              {(
                [
                  ["Start draft taps", data.engagementSummary.draftRoomStarts],
                  ["Pick submits (ok/fail)", data.engagementSummary.draftRoomPicks],
                  ["Queue adds", data.engagementSummary.draftRoomQueueAdds],
                  ["Draft chat sends", data.engagementSummary.draftRoomChatSends],
                  ["Invite copies", data.engagementSummary.draftRoomInviteCopies],
                  ["Comm. league autopick", data.engagementSummary.draftRoomCommissionerAutopickLeague],
                  ["Comm. force autopick", data.engagementSummary.draftRoomCommissionerForceAutopick],
                  ["Manager strip claims", data.engagementSummary.draftRoomClaimSlots],
                ] as const
              ).map(([label, n]) => (
                <div key={label} className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3">
                  <div className="text-lg font-semibold tabular-nums text-cyan-100">{n.toLocaleString()}</div>
                  <div className="text-[11px] text-white/45">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-white/80">Top events</h3>
            <div className="max-h-56 overflow-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0a1228] text-white/50">
                  <tr>
                    <th className="px-2 py-2">Event</th>
                    <th className="px-2 py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.countsByEvent]
                    .sort((a, b) => b._count - a._count)
                    .slice(0, 40)
                    .map((row) => (
                      <tr key={row.event} className="border-t border-white/5">
                        <td className="px-2 py-1.5 font-mono text-white/80">{row.event}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-white/90">{row._count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.engineSampleCounts.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-medium text-white/80">Sampled engine events</h3>
              <p className="mb-2 text-[11px] text-white/45">
                Controlled by <code className="text-cyan-300/80">AF_ANALYTICS_ENGINE_SAMPLE_RATE</code> (default 10%).
              </p>
              <div className="flex flex-wrap gap-2">
                {data.engineSampleCounts.map((e) => (
                  <span
                    key={e.event}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-white/75"
                  >
                    <span className="font-mono">{e.event}</span>
                    <span className="tabular-nums text-cyan-200/90">{e._count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
