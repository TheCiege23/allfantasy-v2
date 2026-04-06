import { Prisma } from "@prisma/client"

/** True when Prisma reports a missing column/table vs. the current schema (deploy `prisma migrate deploy`). */
export function isMissingDatabaseObjectError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2022") return true
    if (err.code === "P2010") {
      const msg = String((err.meta as { message?: string } | undefined)?.message ?? err.message)
      if (/does not exist/i.test(msg) && (/column/i.test(msg) || /relation/i.test(msg))) return true
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /column .* does not exist/i.test(msg) ||
    (msg.includes("does not exist") && (msg.includes("appUserId") || msg.includes("import_job_seasons")))
  )
}
