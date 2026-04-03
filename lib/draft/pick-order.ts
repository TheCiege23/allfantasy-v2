export type DraftPickOrderSlot = {
  id: string
  label: string
  isCpu?: boolean
}

export function buildMockPickOrder(numTeams: number, humanUserId: string, humanLabel = 'You'): DraftPickOrderSlot[] {
  const order: DraftPickOrderSlot[] = [
    { id: humanUserId, label: humanLabel, isCpu: false },
  ]
  for (let i = 1; i < numTeams; i++) {
    order.push({ id: `cpu-${i}`, label: `CPU ${i + 1}`, isCpu: true })
  }
  return order
}

export function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]!
  }
  return s
}
