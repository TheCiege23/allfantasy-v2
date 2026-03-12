"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProviderClient";

export default function TradeAnalyzerPreview() {
  const { t } = useLanguage();
  const router = useRouter();
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const params = new URLSearchParams();
    if (teamA.trim()) params.set("previewSender", teamA.trim());
    if (teamB.trim()) params.set("previewReceiver", teamB.trim());

    const href =
      params.toString().length > 0
        ? `/trade-evaluator?${params.toString()}`
        : "/trade-evaluator";

    router.push(href);
  };

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold sm:text-xl">
            {t("home.preview.title")}
          </h2>
          <p className="max-w-2xl text-xs text-white/70 sm:text-sm mode-muted">
            {t("home.preview.subtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/40 bg-black/40 p-4 shadow-[0_18px_40px_rgba(8,145,178,0.35)] mode-panel-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-white/75 sm:text-sm">
                  {t("home.preview.teamA.label")}
                </label>
                <textarea
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/35 outline-none focus:border-cyan-300/80 sm:text-sm"
                  placeholder={t("home.preview.teamA.placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-white/75 sm:text-sm">
                  {t("home.preview.teamB.label")}
                </label>
                <textarea
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder-white/35 outline-none focus:border-cyan-300/80 sm:text-sm"
                  placeholder={t("home.preview.teamB.placeholder")}
                />
              </div>
            </div>

            <p className="text-[11px] text-white/60 sm:text-xs">
              {t("home.preview.helper")}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={submitting}
                data-af-event="trade_preview_submit_clicked"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-cyan-300 disabled:opacity-70 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                <BarChart3 className="h-4 w-4" />
                <span>{t("home.preview.cta.primary")}</span>
              </button>
              <Link
                href="/trade-analyzer"
                data-af-event="trade_preview_open_full_clicked"
                className="inline-flex items-center gap-1 text-[11px] text-white/70 underline-offset-2 hover:text-white hover:underline sm:text-xs"
              >
                <ArrowRight className="h-3 w-3" />
                <span>{t("home.preview.cta.secondary")}</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

