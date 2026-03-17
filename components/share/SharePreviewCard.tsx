"use client";

import type { SharePayload } from "@/lib/share-engine/types";
import { cn } from "@/lib/utils";

/** Sport-aware accent colors for share card (optional theming). */
const SPORT_ACCENT: Record<string, string> = {
  NFL: "from-amber-500/20 to-orange-600/10 border-amber-500/30",
  NBA: "from-orange-500/20 to-red-600/10 border-orange-500/30",
  MLB: "from-red-500/20 to-rose-600/10 border-red-500/30",
  NHL: "from-sky-500/20 to-blue-600/10 border-sky-500/30",
  NCAAF: "from-emerald-500/20 to-teal-600/10 border-emerald-500/30",
  NCAAB: "from-blue-500/20 to-indigo-600/10 border-blue-500/30",
  SOCCER: "from-green-500/20 to-emerald-600/10 border-green-500/30",
};

export interface SharePreviewCardProps {
  payload: SharePayload;
  className?: string;
}

export function SharePreviewCard({ payload, className }: SharePreviewCardProps) {
  const sport = payload.sport?.toString().toUpperCase() ?? "NFL";
  const accent = SPORT_ACCENT[sport] ?? SPORT_ACCENT.NFL;

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4 text-left",
        accent,
        className
      )}
      data-sport={sport}
    >
      {payload.imageUrl ? (
        <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-black/20">
          <img
            src={payload.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <h3 className="font-semibold text-foreground">{payload.title}</h3>
      {payload.description ? (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {payload.description}
        </p>
      ) : null}
      {payload.weekOrRound ? (
        <p className="mt-1 text-xs text-muted-foreground">{payload.weekOrRound}</p>
      ) : null}
      {payload.cta ? (
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {payload.cta}
        </p>
      ) : null}
    </div>
  );
}
