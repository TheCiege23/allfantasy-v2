import type { LucideIcon } from 'lucide-react'

/**
 * The shared "not yet implemented" surface for every Commissioner OS
 * module route in this foundation phase. Calm and professional, never
 * error-styled — per the Design Constitution, an unimplemented module is a
 * fact about build sequencing, not a problem for the commissioner.
 */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--radius-generous)] border px-6 py-16 text-center"
      style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-center rounded-full p-3" style={{ background: 'var(--panel2)', color: 'var(--muted)' }}>
        <Icon size={28} aria-hidden />
      </div>
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
        {title}
      </h1>
      <p className="max-w-md text-sm" style={{ color: 'var(--muted)' }}>
        {description}
      </p>
    </div>
  )
}
