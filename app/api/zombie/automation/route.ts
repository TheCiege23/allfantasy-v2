import { NextResponse } from 'next/server'
import { runZombieAutomationTick } from '@/lib/zombie/zombieAutomation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const result = await runZombieAutomationTick()
  return NextResponse.json(result)
}
