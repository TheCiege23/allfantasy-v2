"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import SleeperImportForm from "@/components/SleeperImportForm";
import CanonicalImportSummaryCard, {
  type CanonicalPreview,
} from "@/components/league-import/CanonicalImportSummaryCard";
import { UnifiedImportPanel } from "@/components/UnifiedImportPanel";
import {
  fetchImportPreview,
  submitImportCreation,
} from "@/lib/league-import/LeagueCreationImportSubmissionService";
import type { ImportProvider } from '@/lib/league-import/types';
import { useLanguage } from "@/components/i18n/LanguageProviderClient";

/** Bulk phased job is Sleeper-only; other providers use Fetch & Preview (single league). */
const PREVIEW_PROVIDERS: ImportProvider[] = ["espn", "yahoo", "fantrax", "mfl", "fleaflicker"];

export function ImportPageClient({
  userId,
  returnTo,
}: {
  userId: string;
  returnTo: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<ImportProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    provider: ImportProvider;
    sourceInput: string;
    leagueName: string;
    canonical: CanonicalPreview | null;
  } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [conflict, setConflict] = useState<null | { message: string }>(null);

  const commissionerSupport = useMemo(
    () =>
      ({
        sleeper: { status: 'verified' as const, detail: t('import.provider.sleeper.detail') },
        espn: { status: 'verified' as const, detail: t('import.provider.espn.detail') },
        yahoo: { status: 'verified' as const, detail: t('import.provider.yahoo.detail') },
        fantrax: { status: 'verified' as const, detail: t('import.provider.fantrax.detail') },
        mfl: { status: 'verified' as const, detail: t('import.provider.mfl.detail') },
        fleaflicker: { status: 'verified' as const, detail: t('import.provider.fleaflicker.detail') },
      }) satisfies Record<ImportProvider, { status: 'verified' | 'blocked'; detail: string }>,
    [t],
  );

  async function runPreview(provider: ImportProvider, sourceInput: string) {
    setLoadingProvider(provider);
    setError(null);
    setPreviewInfo(null);
    setConflict(null);
    try {
      const preview = await fetchImportPreview(provider, sourceInput);
      if (!preview.ok) {
        throw new Error(preview.error || t('import.error.previewFailed'));
      }
      const payload = preview.data as {
        league?: { name?: string };
        canonical?: CanonicalPreview | null;
      } | undefined;
      const leagueName = payload?.league?.name?.trim() || t('import.leagueDefaultName');
      const canonical = payload?.canonical ?? null;
      setPreviewInfo({ provider, sourceInput, leagueName, canonical });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('import.error.generic'));
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleUnifiedImport(provider: ImportProvider, sourceInput: string) {
    await runPreview(provider, sourceInput);
  }

  async function handleCommit(force = false) {
    if (!previewInfo) return;
    setCommitting(true);
    setError(null);
    setConflict(null);
    try {
      const result = await submitImportCreation(
        previewInfo.provider,
        previewInfo.sourceInput,
        userId,
        undefined,
        { force },
      );
      if (!result.ok) {
        if (result.status === 409) {
          setConflict({ message: result.error ?? t('import.conflict.default') });
          return;
        }
        throw new Error(result.error || t('import.error.commitFailed'));
      }
      const leagueId = result.data?.league.id;
      if (leagueId) {
        router.push(`/league/${encodeURIComponent(leagueId)}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('import.error.commitFailed'));
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] py-20">
      <div className="container mx-auto max-w-2xl px-4">
        <h1 className="mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-5xl font-bold text-transparent">
          {t('import.title')}
        </h1>
        <p className="mb-2 text-center text-gray-400">
          {t('import.subtitle')}
        </p>
        <p className="mb-10 text-center text-[13px] text-white/45">
          {t('import.settingsLink')}{' '}
          <Link href="/settings" className="text-cyan-400/90 underline hover:text-cyan-300">
            {t('import.settingsWord')}
          </Link>
          .
        </p>

        <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            {t('import.providerStatus')}
          </p>
          <p className="mt-2 text-sm text-white/72">
            {t('import.providerHelp')}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(["sleeper", "espn", "yahoo", "fantrax", "mfl", "fleaflicker"] as ImportProvider[]).map((provider) => {
              const support = commissionerSupport[provider]
              return (
                <div
                  key={provider}
                  className={`rounded-xl border px-3 py-3 text-left ${
                    support.status === 'verified'
                      ? 'border-emerald-500/20 bg-emerald-500/[0.08]'
                      : 'border-amber-500/20 bg-amber-500/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold capitalize text-white">{provider}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        support.status === 'verified'
                          ? 'bg-emerald-400/20 text-emerald-200'
                          : 'bg-amber-400/20 text-amber-200'
                      }`}
                    >
                      {support.status === 'verified' ? t('import.status.enabled') : t('import.status.blocked')}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-white/65">{support.detail}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => router.push(returnTo)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            {t('import.backToCreate')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
          >
            {t('import.home')}
          </button>
        </div>

        <div className="mb-14">
          <SleeperImportForm />
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold text-white">{t('import.otherPlatforms')}</h2>
        <p className="mb-6 text-center text-[13px] text-white/50">
          {t('import.otherPlatformsHelp')}
        </p>
        <UnifiedImportPanel
          providers={PREVIEW_PROVIDERS}
          onImport={handleUnifiedImport}
          loadingProvider={loadingProvider}
        />
        {previewInfo && (
          <div className="mt-6 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
            <p className="mb-1 text-[15px] font-semibold text-cyan-200">{t('import.previewLoaded')}</p>
            <p className="mb-3 text-[13px] text-white/75">
              {previewInfo.leagueName} ({previewInfo.provider})
            </p>
            {previewInfo.canonical ? (
              <div className="mb-3">
                <CanonicalImportSummaryCard canonical={previewInfo.canonical} />
              </div>
            ) : null}
            <p className="mb-3 text-[12px] text-white/45">
              {t('import.commitHelp')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={committing}
                onClick={() => void handleCommit(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[13px] font-bold text-black transition-colors hover:bg-cyan-400 disabled:opacity-40"
              >
                {committing ? t('import.importing') : t('import.commitImport')}
              </button>
              <Link
                href={returnTo}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-[13px] font-semibold text-cyan-100 hover:bg-cyan-400/20"
              >
                {t('import.useCreateLeagueInstead')}
              </Link>
            </div>
            {conflict && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-[12px] text-amber-100">
                <p>{conflict.message}</p>
                <button
                  type="button"
                  disabled={committing}
                  onClick={() => void handleCommit(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-black hover:bg-amber-300 disabled:opacity-40"
                >
                  {t('import.reimportOverExisting')}
                </button>
              </div>
            )}
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
