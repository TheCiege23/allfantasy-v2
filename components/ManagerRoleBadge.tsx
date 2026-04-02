type Role = 'commissioner' | 'co_commissioner' | 'orphan' | 'member'

const ROLE_CONFIG = {
  commissioner:    { label: 'C',  cls: 'bg-amber-500/25 text-amber-400 border-amber-500/40' },
  co_commissioner: { label: 'CC', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  orphan:          { label: 'O',  cls: 'bg-cyan-500/20  text-cyan-400  border-cyan-500/30'  },
  member:          null,
} satisfies Record<Role, { label: string; cls: string } | null>

export function ManagerRoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as Role]
  if (!cfg) return null
  return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
}
