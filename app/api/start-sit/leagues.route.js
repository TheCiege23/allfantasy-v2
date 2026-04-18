// app/api/start-sit/leagues/route.js
// GET /api/start-sit/leagues?userId=xxx
// Returns user's leagues grouped by sport for the popup dropdowns.
// Hits your platform DB first; falls back to defaults.

import { NextResponse } from "next/server";

// TODO: import your DB client — Prisma example shown
// import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  try {
    // ── 1. Try your platform database first ──────────────────────────────────
    // Uncomment and adapt to your ORM:
    //
    // const userLeagues = await prisma.league.findMany({
    //   where: { members: { some: { userId } } },
    //   select: { id: true, name: true, sport: true, format: true, platform: true },
    // });
    //
    // if (userLeagues.length > 0) {
    //   const grouped = userLeagues.reduce((acc, l) => {
    //     if (!acc[l.sport]) acc[l.sport] = [];
    //     acc[l.sport].push({ id: l.id, name: l.name, format: l.format });
    //     return acc;
    //   }, {});
    //   return NextResponse.json(grouped);
    // }

    // ── 2. Default AllFantasy leagues (used until DB is wired) ───────────────
    const defaults = {
      nfl: [
        { id: "v2-tourn-nfl",         name: "V2 Tourn NFL",          format: "Tournament"   },
        { id: "kbi-black-gold-2025",  name: "KBI Black & Gold 2025", format: "PPR"          },
        { id: "zombie-universe-nfl",  name: "Zombie Universe NFL",   format: "Zombie League" },
        { id: "survivor-nfl",         name: "Survivor League NFL",   format: "Survivor"     },
        { id: "dynasty-main",         name: "Dynasty Main",          format: "Dynasty"      },
        { id: "keeper-league",        name: "Keeper League",         format: "Keeper"       },
        { id: "redraft-2025",         name: "Redraft 2025",          format: "PPR"          },
        { id: "tournament-cup-nfl",   name: "Tournament Cup NFL",    format: "Tournament"   },
      ],
      nba: [
        { id: "kbi-nba-hoops",        name: "KBI NBA Hoops",         format: "Standard"     },
        { id: "nba-dynasty-2025",     name: "NBA Dynasty 2025",      format: "Dynasty"      },
        { id: "nba-tournament",       name: "NBA Tournament",        format: "Tournament"   },
      ],
      mlb: [
        { id: "kbi-baseball-2025",    name: "KBI Baseball 2025",     format: "Standard"     },
        { id: "mlb-dynasty",          name: "MLB Dynasty",           format: "Dynasty"      },
      ],
      nhl: [
        { id: "kbi-hockey-2025",      name: "KBI Hockey 2025",       format: "Standard"     },
      ],
      soccer: [
        { id: "mls-fantasy-2025",     name: "MLS Fantasy 2025",      format: "Standard"     },
        { id: "epl-fantasy",          name: "EPL Fantasy",           format: "Standard"     },
        { id: "champions-league",     name: "Champions League Fantasy", format: "Standard"  },
      ],
      cfb: [
        { id: "cfb-2025",             name: "College Gridiron 2025", format: "Standard"     },
      ],
      cbb: [
        { id: "cbb-2025",             name: "College Hoops 2025",    format: "Standard"     },
      ],
    };

    return NextResponse.json(defaults, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[/api/start-sit/leagues]", err);
    return NextResponse.json({ error: "Failed to load leagues" }, { status: 500 });
  }
}
