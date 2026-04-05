import { NextRequest, NextResponse } from "next/server";

import { requireCronAuth } from "@/app/api/cron/_auth";
import { isGameSlateStarted } from "@/lib/autocoach/StatusMonitor";
import { prisma } from "@/lib/prisma";
import { getAutoCoachStatusQueue } from "@/lib/queues/bullmq";
import { SUPPORTED_SPORTS } from "@/lib/sport-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(`${today}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const grouped = await prisma.sportsGame.groupBy({
    by: ["sport"],
    where: { startTime: { gte: start, lt: end } },
    _count: { _all: true },
  });

  if (grouped.length === 0) {
    return NextResponse.json({ enqueuedSports: [] as string[], gameDate: today, note: "no_games_today" });
  }

  const queue = getAutoCoachStatusQueue();
  if (!queue) {
    return NextResponse.json({
      enqueuedSports: [] as string[],
      gameDate: today,
      note: "redis_not_configured",
    });
  }

  const supported = new Set<string>(SUPPORTED_SPORTS as unknown as string[]);
  const enqueuedSports: string[] = [];

  for (const row of grouped) {
    const sport = row.sport;
    if (!supported.has(sport)) continue;
    if (await isGameSlateStarted(sport, today)) continue;
    await queue.add(
      `autocoach-status-${sport}-${today}`,
      { type: "status_scan_sport", sport, gameDate: today },
      { removeOnComplete: true }
    );
    enqueuedSports.push(sport);
  }

  return NextResponse.json({ enqueuedSports, gameDate: today });
}
