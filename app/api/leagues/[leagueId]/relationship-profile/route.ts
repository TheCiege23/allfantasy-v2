import { NextResponse } from "next/server";
import { buildLeagueRelationshipProfile } from "@/lib/league-intelligence-graph";

export const dynamic = "force-dynamic";

/**
 * GET — returns LeagueRelationshipProfile (rivalries, trade clusters, influence leaders,
 * central/isolated managers, dynasty power transitions, elimination patterns).
 * When season is omitted, includes all dynasty history.
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

    const profile = await buildLeagueRelationshipProfile({
      leagueId,
      season: Number.isNaN(season) ? null : season,
      limits: {
        rivalries: 20,
        clusters: 10,
        influence: 15,
        central: 30,
        transitions: 20,
        elimination: 20,
      },
    });
    return NextResponse.json(profile);
  } catch (e) {
    console.error("[relationship-profile GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build relationship profile" },
      { status: 500 }
    );
  }
}
