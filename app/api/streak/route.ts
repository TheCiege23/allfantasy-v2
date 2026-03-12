import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getUserStreakSummary, incrementStreak } from "@/lib/streaks";

function notAuthenticated() {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) return notAuthenticated();

  const streak = await getUserStreakSummary(user.id);
  return NextResponse.json({ streak });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.id) return notAuthenticated();

  const streak = await incrementStreak(user.id);
  return NextResponse.json({ streak });
}
