"use client"

export default function ProfileImagePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-white/60 mb-1">Profile Image (placeholder)</label>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {["crest", "bolt", "crown"].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`rounded-lg border px-2 py-2 capitalize ${value === preset ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "border-white/10 bg-black/20 text-white/70"}`}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
