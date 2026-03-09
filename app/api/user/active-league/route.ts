import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUserLike = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type LeagueLike = {
  id?: string | number | null;
  status?: string | null;
  [key: string]: unknown;
};

type LeagueMembershipLike = {
  league?: LeagueLike | null;
  [key: string]: unknown;
};

function extractUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;

  const sessionObj = session as { user?: SessionUserLike };
  const user = sessionObj.user;

  if (!user || typeof user !== "object") return null;
  if (typeof user.id === "string" && user.id.trim()) return user.id.trim();

  return null;
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = extractUserId(session);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const prismaAny = prisma as any;

    const memberships: LeagueMembershipLike[] = await prismaAny.leagueMember.findMany({
      where: {
        userId,
      },
      include: {
        league: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const activeLeagues = memberships
      .map((membership: LeagueMembershipLike) => membership.league ?? null)
      .filter((league: LeagueLike | null): league is LeagueLike => {
        if (!league) return false;

        const status = String(league.status ?? "")
          .trim()
          .toUpperCase();

        if (!status) return true;

        return !["ARCHIVED", "COMPLETE", "COMPLETED", "CLOSED"].includes(status);
      });

    return NextResponse.json({
      ok: true,
      activeLeague: activeLeagues[0] ?? null,
      activeLeagues,
      count: activeLeagues.length,
    });
  } catch (error: unknown) {
    console.error("[user/active-league] error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load active league.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS",
    },
  });
}