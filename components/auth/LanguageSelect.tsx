"use client"

export default function LanguageSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-white/60 mb-1">Language</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 transition"
      >
        <option value="en">English</option>
        <option value="es">Spanish</option>
      </select>
    </div>
  )
}
