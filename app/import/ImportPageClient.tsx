"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SleeperImportForm from "@/components/SleeperImportForm";
import CanonicalImportSummaryCard, {
  type CanonicalPreview,
} from "@/components/league-import/CanonicalImportSummaryCard";
import { UnifiedImportPanel } from "@/components/UnifiedImportPanel";
import { fetchImportPreview } from "@/lib/league-import/LeagueCreationImportSubmissionService";
import type { ImportProvider } from '@/lib/league-import/types';

/** Bulk phased job is Sleeper-only; other providers use Fetch & Preview (single league). */
const PREVIEW_PROVIDERS: ImportProvider[] = ["espn", "yahoo", "fantrax", "mfl", "fleaflicker"];

export function ImportPageClient({
  userId,
  returnTo,
}: {
  userId: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<ImportProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    provider: ImportProvider;
    leagueName: string;
    canonical: CanonicalPreview | null;
  } | null>(null);

  async function handleUnifiedImport(provider: ImportProvider, sourceInput: string) {
    setLoadingProvider(provider);
    setError(null);
    setPreviewInfo(null);
    try {
      const preview = await fetchImportPreview(provider, sourceInput);
      if (!preview.ok) {
        throw new Error(preview.error || "Preview failed");
      }
      const payload = preview.data as {
        league?: { name?: string };
        canonical?: CanonicalPreview | null;
      } | undefined;
      const leagueName = payload?.league?.name?.trim() || "League";
      const canonical = payload?.canonical ?? null;
      setPreviewInfo({ provider, leagueName, canonical });
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
        <p className="mb-2 text-center text-gray-400">
          Sleeper has the broadest automated import (all seasons we find). ESPN currently imports teams and weekly scores;
          Yahoo, Fantrax, MFL, and Fleaflicker use preview + League Sync flows.
        </p>
        <p className="mb-10 text-center text-[13px] text-white/45">
          Connect external accounts in{' '}
          <Link href="/settings" className="text-cyan-400/90 underline hover:text-cyan-300">
            Settings
          </Link>
          .
        </p>

        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => router.push(returnTo)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            Back to Create
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            Home
          </button>
        </div>

        <div className="mb-14">
          <SleeperImportForm />
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold text-white">Other platforms</h2>
        <p className="mb-6 text-center text-[13px] text-white/50">
          Paste a league ID or key, then Fetch & Preview. Private leagues often need cookies or API keys saved in League Sync first.
        </p>
        <UnifiedImportPanel
          providers={PREVIEW_PROVIDERS}
          onImport={handleUnifiedImport}
          loadingProvider={loadingProvider}
        />
        {previewInfo && (
          <div className="mt-6 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <p className="mb-1 text-[15px] font-semibold text-cyan-200">Preview loaded</p>
            <p className="mb-3 text-[13px] text-white/75">
              {previewInfo.leagueName} ({previewInfo.provider})
            </p>
            {previewInfo.canonical ? (
              <div className="mb-3">
                <CanonicalImportSummaryCard canonical={previewInfo.canonical} />
              </div>
            ) : null}
            <p className="mb-3 text-[12px] text-white/45">
              Continue in Create League to finish importing this league into AllFantasy, or use League Sync for ongoing sync.
            </p>
            <Link
              href={returnTo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[13px] font-bold text-black transition-colors hover:bg-cyan-400"
            >
              Continue to Create League →
            </Link>
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[13px] text-red-400">⚠ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
