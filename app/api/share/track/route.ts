/**
 * Share tracking endpoint. Records modal opens, attempts, completes, and fallbacks.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withApiUsage } from "@/lib/telemetry/usage";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SHAREABLE_KINDS,
  SHARE_DESTINATIONS,
  SHARE_TRACK_EVENTS,
  SHARE_VISIBILITY,
} from "@/lib/share-engine/types";

function safeString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function safeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

export const POST = withApiUsage({
  endpoint: "/api/share/track",
  tool: "ShareTrack",
})(async (req: Request) => {
  try {
    const body = await req.json().catch(() => null);
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
    const event = safeString(body?.event, 64);

    if (!event || !SHARE_TRACK_EVENTS.includes(event as (typeof SHARE_TRACK_EVENTS)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid or missing event" }, { status: 400 });
    }

    const metaRaw = body?.meta && typeof body.meta === "object" ? body.meta : {};
    const shareType = safeString((metaRaw as Record<string, unknown>).shareType, 64);
    const destination = safeString((metaRaw as Record<string, unknown>).destination, 32);
    const visibility = safeString((metaRaw as Record<string, unknown>).visibility, 16);

    const meta = {
      shareType:
        shareType && SHAREABLE_KINDS.includes(shareType as (typeof SHAREABLE_KINDS)[number])
          ? shareType
          : "league_invite",
      destination:
        destination && SHARE_DESTINATIONS.includes(destination as (typeof SHARE_DESTINATIONS)[number])
          ? destination
          : null,
      shareId: safeString((metaRaw as Record<string, unknown>).shareId, 128),
      sport: safeString((metaRaw as Record<string, unknown>).sport, 32),
      path: safeString((metaRaw as Record<string, unknown>).path, 500),
      surface: safeString((metaRaw as Record<string, unknown>).surface, 64),
      shareUrl: safeString((metaRaw as Record<string, unknown>).shareUrl, 1000),
      visibility:
        visibility && SHARE_VISIBILITY.includes(visibility as (typeof SHARE_VISIBILITY)[number])
          ? visibility
          : null,
      usedFallback: safeBoolean((metaRaw as Record<string, unknown>).usedFallback) ?? false,
    };

    await prisma.analyticsEvent.create({
      data: {
        event,
        sessionId: safeString(body?.sessionId, 128),
        path: safeString(body?.path, 500),
        referrer: safeString(body?.referrer, 500),
        userAgent: safeString(req.headers.get("user-agent"), 500),
        userId: session?.user?.id ?? null,
        toolKey: "ShareEngine",
        meta,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
});
