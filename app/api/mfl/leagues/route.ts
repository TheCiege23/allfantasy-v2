import { withApiUsage } from "@/lib/telemetry/usage";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { requireVerifiedUser } from "@/lib/auth-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MflLeagueRecord = {
  league_id: string;
  name?: string;
  url?: string;
  franchise_id?: string;
  franchise_name?: string;
};

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function getMFLConnection() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("mfl_session")?.value;
  if (!sessionId) return null;

  return prisma.mFLConnection.findUnique({
    where: { sessionId },
  });
}

async function fetchMFLLeagues(year: number, mflCookie: string) {
  const leaguesUrl = `https://api.myfantasyleague.com/${year}/export?TYPE=myleagues&JSON=1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(leaguesUrl, {
      headers: {
        Cookie: `MFL_USER_ID=${mflCookie}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch leagues: ${res.status}`);
    }

    return (await res.json()) as {
      leagues?: {
        league?: MflLeagueRecord | MflLeagueRecord[];
      };
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = withApiUsage({
  endpoint: "/api/mfl/leagues",
  tool: "MflLeagues",
})(async () => {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) {
      return auth.response;
    }

    const connection = await getMFLConnection();

    if (!connection) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const year = connection.year || new Date().getFullYear();
    const data = await fetchMFLLeagues(year, connection.mflCookie);

    const rawLeagues = toArray(data.leagues?.league);

    const leagues = rawLeagues.map((league) => ({
      leagueId: league.league_id,
      name: league.name || `League ${league.league_id}`,
      url: league.url,
      franchiseId: league.franchise_id,
      franchiseName: league.franchise_name,
    }));

    return NextResponse.json({
      connected: true,
      username: connection.mflUsername,
      year,
      leagues,
    });
  } catch (error) {
    console.error("MFL leagues error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch leagues" },
      { status: 500 }
    );
  }
});
