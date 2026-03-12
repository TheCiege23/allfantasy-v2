import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getMoodHistory, getTodayMood, logMoodEntry } from "@/lib/mood";

function notAuthenticated() {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) return notAuthenticated();

  const url = new URL(req.url);
  const history = url.searchParams.get("history") === "true";

  if (history) {
    const entries = await getMoodHistory(user.id, 30);
    return NextResponse.json({ entries });
  }

  const mood = await getTodayMood(user.id);
  return NextResponse.json({ mood });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.id) return notAuthenticated();

  const body = (await req.json().catch(() => null)) as { mood?: string; note?: string } | null;
  const mood = body?.mood?.trim();

  if (!mood) {
    return NextResponse.json({ error: "Mood is required." }, { status: 400 });
  }

  const entry = await logMoodEntry(user.id, mood, body?.note);
  return NextResponse.json({ entry });
}
