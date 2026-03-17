/**
 * Share tracking endpoint (PROMPT 145). Validates share events and records to analytics.
 * Client can use this or POST /api/analytics/track with event share_attempt / share_complete.
 */

import { withApiUsage } from "@/lib/telemetry/usage";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SHAREABLE_KINDS,
  SHARE_DESTINATIONS,
} from "@/lib/share-engine/types";

function safeStr(v: unknown, max = 500): string | null {
  const s = typeof v === "string" ? v : "";
  const out = s.length > max ? s.slice(0, max) : s;
  return out || null;
}

const VALID_EVENTS = new Set(["share_attempt", "share_complete"]);

export const POST = withApiUsage({
  endpoint: "/api/share/track",
  tool: "ShareTrack",
})(async (req: Request) => {
  try {
    const body = await req.json().catch(() => null);
    const event = safeStr(body?.event, 64);
    if (!event || !VALID_EVENTS.has(event)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing event" },
        { status: 400 }
      );
    }

    const sessionId = safeStr(body?.sessionId, 128) || null;
    const path = safeStr(body?.path, 500) || null;
    const referrer = safeStr(body?.referrer, 500) || null;
    const userAgent = safeStr(req.headers.get("user-agent"), 500) || null;

    const metaRaw = body?.meta && typeof body.meta === "object" ? body.meta : {};
    const shareType = safeStr(metaRaw.shareType, 64);
    const destination = safeStr(metaRaw.destination, 32);
    const meta = {
      ...metaRaw,
      shareType:
        shareType && SHAREABLE_KINDS.includes(shareType as any)
          ? shareType
          : "league_invite",
      destination:
        destination && SHARE_DESTINATIONS.includes(destination as any)
          ? destination
          : "copy_link",
    };
    const metaStr =
      typeof meta === "object"
        ? JSON.stringify(meta).slice(0, 10_000)
        : "{}";
    const metaJson = JSON.parse(metaStr);

    await prisma.analyticsEvent.create({
      data: {
        event,
        sessionId,
        path,
        referrer,
        userAgent,
        toolKey: "ShareEngine",
        meta: metaJson,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
});
