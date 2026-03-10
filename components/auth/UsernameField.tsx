"use client"

export default function UsernameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-white/60 mb-1">Username *</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
        placeholder="your_username"
        maxLength={30}
        autoComplete="username"
        required
      />
      <p className="mt-1 text-xs text-white/30">Letters, numbers, underscores. 3-30 characters.</p>
    </div>
  )
}
