"use client";


import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { UnifiedImportPanel } from "@/components/UnifiedImportPanel";
import type { ImportProvider } from '@/lib/league-import/types';


const PROVIDERS: ImportProvider[] = ["sleeper", "espn", "yahoo", "fantrax", "mfl"];

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


  const [loadingProvider, setLoadingProvider] = useState<ImportProvider | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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


  async function handleUnifiedImport(provider: ImportProvider, sourceInput: string) {
    setLoadingProvider(provider);
    setError(null);
    setResult(null);
    try {
      let body: any = {};
      if (provider === 'sleeper') {
        body = { username: sourceInput.trim(), platform: 'sleeper' };
      } else if (provider === 'espn') {
        body = { leagueId: sourceInput.trim(), platform: 'espn' };
      } else if (provider === 'yahoo') {
        body = { leagueKey: sourceInput.trim(), platform: 'yahoo' };
      } else if (provider === 'fantrax') {
        body = { source: sourceInput.trim(), platform: 'fantrax' };
      } else if (provider === 'mfl') {
        body = { leagueId: sourceInput.trim(), platform: 'mfl' };
      }
      const res = await fetch('/api/leagues/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
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
      if (data.success && typeof data.jobId === 'string' && data.jobId.length > 0) {
        router.push(`/dashboard/rankings?jobId=${encodeURIComponent(data.jobId)}`);
        return;
      }
      setResult({
        imported: data.imported ?? data.leagueCount ?? 0,
        seasons: data.seasons ?? 0,
        sports: data.sports ?? {},
        years: Array.isArray(data.years) ? data.years : [],
        displayName: data.displayName ?? sourceInput,
        commissionerLeagues: typeof data.commissionerLeagues === 'number' ? data.commissionerLeagues : undefined,
        historicalLeagues: typeof data.historicalLeagues === 'number' ? data.historicalLeagues : undefined,
        skippedNotCommissioner: typeof data.skippedNotCommissioner === 'number' ? data.skippedNotCommissioner : undefined,
        status: typeof data.status === 'string' ? data.status : undefined,
        jobId: typeof data.jobId === 'string' ? data.jobId : undefined,
        leagueKeys: Array.isArray(data.leagueKeys) ? data.leagueKeys : undefined,
      });
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'Import failed. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] py-20">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-5xl font-bold text-transparent">
          Import Your League
        </h1>
        <p className="mb-12 text-center text-gray-400">
          Import from any supported provider below. All imports are processed sequentially.
        </p>
        <UnifiedImportPanel
          providers={PROVIDERS}
          onImport={handleUnifiedImport}
          loadingProvider={loadingProvider}
        />
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[13px] text-red-400">⚠ {error}</p>
          </div>
        )}
        {result && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
            <p className="mb-1 text-[16px] font-bold text-green-400">
              {result.status === 'processing' ? '✅ Leagues saved — syncing details…' : '✅ Import Complete!'}
            </p>
            <p className="mb-1 text-[13px] text-white/70">
              {result.imported} leagues queued across {result.seasons} seasons
              {result.status === 'processing'
                ? '. Rank and stats update in the background on your Rankings page.'
                : ''}
            </p>
            {Object.keys(result.sports).length > 0 && (
              <p className="mb-3 text-[11px] text-white/40">
                {Object.entries(result.sports)
                  .map(([s, n]) => `${s}: ${n} league${n !== 1 ? 's' : ''}`)
                  .join(' · ')}
              </p>
            )}
            {result.commissionerLeagues != null && result.historicalLeagues != null && (
              <p className="mt-1 text-[12px] text-white/40">
                Commissioner leagues: {result.commissionerLeagues} current season ·{' '}
                {result.historicalLeagues} historical seasons included
              </p>
            )}
            {result.skippedNotCommissioner != null && result.skippedNotCommissioner > 0 && (
              <p className="mt-1 text-[11px] text-amber-400/80">
                ⚠ {result.skippedNotCommissioner} current-season league
                {result.skippedNotCommissioner !== 1 ? 's' : ''} skipped — you are not the commissioner
              </p>
            )}
            <a
              href={
                result.jobId
                  ? `/dashboard/rankings?jobId=${encodeURIComponent(result.jobId)}`
                  : '/dashboard/rankings'
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[13px] font-bold text-black transition-colors hover:bg-cyan-400"
            >
              View rank & legacy profile →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
