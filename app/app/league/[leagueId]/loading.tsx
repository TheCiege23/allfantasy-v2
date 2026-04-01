function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />
}

export default function LoadingLeaguePage() {
  return (
    <div className="min-h-screen bg-[#0B0F1E] px-4 pb-[148px] pt-4">
      <div className="mx-auto max-w-md space-y-4">
        <SkeletonBlock className="h-14" />
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-80" />
      </div>
    </div>
  )
}
