import { NextResponse } from 'next/server'

const QUICK_ACTIONS = [
  'Should I accept this trade?',
  'Who is my best waiver add this week?',
  'Who should I draft at my next pick?',
]

export async function GET() {
  return NextResponse.json({ status: 'ok', aiQuickActions: QUICK_ACTIONS })
}
