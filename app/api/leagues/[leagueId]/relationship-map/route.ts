import { NextResponse } from "next/server";
import { buildRelationshipMap } from "@/lib/league-intelligence-graph";

export const dynamic = "force-dynamic";

/**
 * GET — returns nodes, edges, rivals, trade partners, etc. for graph visualization.
 * Optional ?season= for single season; omit for all dynasty history.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params;
    if (!leagueId) {
      return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
    }
    const url = new URL(_req.url);
    const seasonParam = url.searchParams.get("season");
    const season = seasonParam != null ? parseInt(seasonParam, 10) : null;

    const map = await buildRelationshipMap({
      leagueId,
      season: Number.isNaN(season) ? null : season,
      limit: 100,
    });
    return NextResponse.json(map);
  } catch (e) {
    console.error("[relationship-map GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build relationship map" },
      { status: 500 }
    );
  }
}
