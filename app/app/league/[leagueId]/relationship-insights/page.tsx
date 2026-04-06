"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { UnifiedRelationshipInsightsPanel } from "@/components/app/league-intelligence/UnifiedRelationshipInsightsPanel";

export default function RelationshipInsightsPage() {
  const params = useParams<{ leagueId: string }>();
  const leagueId = params?.leagueId ?? "";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4">
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-white">Relationship & Storytelling Insights</h1>
            <p className="text-xs text-white/55">
              Unified graph, rivalry, behavior profile, and drama context.
            </p>
          </div>
          <Link
            href={`/league/${encodeURIComponent(leagueId)}?tab=Intelligence`}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            Back to Intelligence
          </Link>
        </div>
      </section>

      <UnifiedRelationshipInsightsPanel leagueId={leagueId} />
    </main>
  );
}
