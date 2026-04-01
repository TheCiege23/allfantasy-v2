import { Shield } from 'lucide-react'

export default function PlayerHeadshot({
  src,
  alt,
  size = 40,
}: {
  src?: string | null
  alt: string
  size?: number
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="rounded-full border border-white/10 object-cover"
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border border-white/10 bg-[#1C2539] text-[#8B9DB8]"
      style={{ width: size, height: size }}
    >
      <Shield size={Math.max(16, Math.floor(size / 2))} />
    </div>
  )
}
