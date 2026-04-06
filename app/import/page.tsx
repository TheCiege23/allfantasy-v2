"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import EspnImportForm from "@/components/EspnImportForm";

const SLEEPER_LAUNCH_YEAR = 2017;

type ImportResult = {
  imported: number;
  seasons: number;
  sports: Record<string, number>;
  years: number[];
  displayName: string;
  commissionerLeagues?: number;
  historicalLeagues?: number;
  skippedNotCommissioner?: number;
  status?: string;
  jobId?: string;
  leagueKeys?: Array<{ platformLeagueId: string; season: number }>;
};

function getImportErrorMessage(data: { error?: string } | null | undefined, fallback: string) {
  if (data?.error === "VERIFICATION_REQUIRED") {
    return "Verify your email or phone before importing leagues.";
  }
  if (data?.error === "AGE_REQUIRED") {
    return "Confirm that you are 18+ before importing leagues.";
  }
  if (
    data?.error === "UNAUTHENTICATED" ||
    data?.error === "Unauthorized" ||
    data?.error === "You must be logged in to import" ||
    data?.error === "Authentication required"
  ) {
    return "Sign in to import leagues.";
  }
  return data?.error || fallback;
}

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sleeperUsername, setSleeperUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanEndYear, setScanEndYear] = useState<number | null>(null);

  useEffect(() => {
    setScanEndYear(new Date().getFullYear() + 1);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/import");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] text-white/70">
        Loading…
      </div>
    );
  }

  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return null;
  }

  async function handleImport() {
    const trimmed = sleeperUsername.trim();
    if (!trimmed) {
      setError("Please enter your Sleeper username");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/leagues/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: trimmed, platform: "sleeper" }),
      });

      const text = await res.text();
      let data: ImportResult & { error?: string; success?: boolean; leagueKeys?: unknown; leagueCount?: number };
      try {
        data = JSON.parse(text) as ImportResult & { error?: string; success?: boolean; leagueKeys?: unknown; leagueCount?: number };
      } catch {
        throw new Error(`Server error: ${text.slice(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(getImportErrorMessage(data, data.error || `Import failed (${res.status})`));
      }

      if (data.success && typeof data.jobId === "string" && data.jobId.length > 0) {
        router.push(`/dashboard/rankings?jobId=${encodeURIComponent(data.jobId)}`);
        return;
      }

      const leagueKeysParsed =
        Array.isArray(data.leagueKeys) &&
        data.leagueKeys.every(
          (k) =>
            k &&
            typeof k === "object" &&
            typeof (k as { platformLeagueId?: string }).platformLeagueId === "string" &&
            typeof (k as { season?: number }).season === "number"
        )
          ? (data.leagueKeys as ImportResult["leagueKeys"])
          : undefined;

      setResult({
        imported: data.imported ?? data.leagueCount ?? 0,
        seasons: data.seasons ?? 0,
        sports: data.sports ?? {},
        years: Array.isArray(data.years) ? data.years : [],
        displayName: data.displayName ?? trimmed,
        commissionerLeagues: typeof data.commissionerLeagues === "number" ? data.commissionerLeagues : undefined,
        historicalLeagues: typeof data.historicalLeagues === "number" ? data.historicalLeagues : undefined,
        skippedNotCommissioner:
          typeof data.skippedNotCommissioner === "number" ? data.skippedNotCommissioner : undefined,
        status: typeof data.status === "string" ? data.status : undefined,
        jobId: typeof data.jobId === "string" ? data.jobId : undefined,
        leagueKeys: leagueKeysParsed,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const yearLine =
    scanEndYear !== null ? (
      <>
        {SLEEPER_LAUNCH_YEAR} to {scanEndYear}
      </>
    ) : (
      <span suppressHydrationWarning>{SLEEPER_LAUNCH_YEAR} to …</span>
    );

  const seasonsBullet =
    scanEndYear !== null ? (
      <>
        All seasons ({SLEEPER_LAUNCH_YEAR} → {scanEndYear})
      </>
    ) : (
      <span suppressHydrationWarning>All seasons (2017 → …)</span>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] py-20">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-5xl font-bold text-transparent">
          Import Your League
        </h1>
        <p className="mb-12 text-center text-gray-400">
          Sleeper has broader import coverage today. ESPN currently imports teams and weekly scores.
        </p>

        <div className="space-y-12">
          <div className="rounded-2xl border border-white/10 bg-[#0a1228]/90 p-4 backdrop-blur-sm sm:p-5">
            <div className="mb-4 flex flex-col space-y-1.5 pb-3">
              <div className="flex items-center gap-3 text-xl font-bold leading-none tracking-tight text-white">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[16px] font-black text-white"
                  style={{ background: "linear-gradient(135deg, #1a9e5c, #16a34a)" }}
                  aria-hidden
                >
                  S
                </div>
                <span>Import from Sleeper</span>
              </div>
              <p className="text-xs text-slate-400 sm:text-sm">
                Connect your Sleeper account to import all your leagues and every season automatically — from {yearLine}.
              </p>
            </div>

            <div className="space-y-4 pt-0">
              <div>
                <label htmlFor="sleeper-username" className="mb-1 block text-sm text-slate-400">
                  Sleeper Username
                </label>
                <input
                  id="sleeper-username"
                  type="text"
                  value={sleeperUsername}
                  onChange={(e) => setSleeperUsername(e.target.value)}
                  disabled={loading}
                  placeholder="e.g. your Sleeper username"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <ul className="space-y-1 text-sm text-slate-400">
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> All sports we scan on Sleeper (NFL, NBA)
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> {seasonsBullet}
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-500">✓</span> Dynasty, redraft, and best ball
                </li>
              </ul>

              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={loading || !sleeperUsername.trim()}
                className="w-full rounded-xl bg-cyan-600 py-3 text-[14px] font-bold text-white transition-all hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving leagues… usually under 10 seconds
                  </span>
                ) : (
                  "Import All Leagues"
                )}
              </button>

              {error ? (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-[13px] text-red-400">⚠ {error}</p>
                </div>
              ) : null}

              {result ? (
                <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                  <p className="mb-1 text-[16px] font-bold text-green-400">
                    {result.status === "processing" ? "✅ Leagues saved — syncing details…" : "✅ Import Complete!"}
                  </p>
                  <p className="mb-1 text-[13px] text-white/70">
                    {result.imported} leagues queued across {result.seasons} seasons
                    {result.status === "processing"
                      ? ". Rank and stats update in the background on your Rankings page."
                      : ""}
                  </p>
                  {Object.keys(result.sports).length > 0 ? (
                    <p className="mb-3 text-[11px] text-white/40">
                      {Object.entries(result.sports)
                        .map(([s, n]) => `${s}: ${n} league${n !== 1 ? "s" : ""}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {result.commissionerLeagues != null && result.historicalLeagues != null ? (
                    <p className="mt-1 text-[12px] text-white/40">
                      Commissioner leagues: {result.commissionerLeagues} current season ·{" "}
                      {result.historicalLeagues} historical seasons included
                    </p>
                  ) : null}
                  {result.skippedNotCommissioner != null && result.skippedNotCommissioner > 0 ? (
                    <p className="mt-1 text-[11px] text-amber-400/80">
                      ⚠ {result.skippedNotCommissioner} current-season league
                      {result.skippedNotCommissioner !== 1 ? "s" : ""} skipped — you are not the commissioner
                    </p>
                  ) : null}
                  <Link
                    href={
                      result.jobId
                        ? `/dashboard/rankings?jobId=${encodeURIComponent(result.jobId)}`
                        : "/dashboard/rankings"
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[13px] font-bold text-black transition-colors hover:bg-cyan-400"
                  >
                    View rank &amp; legacy profile →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <EspnImportForm />
        </div>
      </div>
    </div>
  );
}
