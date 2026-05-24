import { cn } from "@/lib/utils"

type SkeletonVariant = "shimmer" | "pulse"

function Skeleton({
  className,
  variant = "shimmer",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: SkeletonVariant }) {
  if (variant === "pulse") {
    return (
      <div
        className={cn("animate-pulse rounded-md bg-[color:var(--subtle-bg)]", className)}
        {...props}
      />
    )
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-[color:var(--subtle-bg)]", className)}
      {...props}
    >
      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
    </div>
  )
}

export { Skeleton }
