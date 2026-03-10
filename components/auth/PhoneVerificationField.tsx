"use client"

export default function PhoneVerificationField({ value, onChange, required }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-white/60 mb-1">Phone {required ? "*" : "(optional)"}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="tel"
        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30 transition"
        placeholder="+1 (555) 123-4567"
        autoComplete="tel"
      />
    </div>
  )
}
