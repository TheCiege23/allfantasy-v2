import { PrismaClient, Prisma } from "@prisma/client";
import { getDatabaseUrlOrThrow } from "@/lib/env/database-url";

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;

  const err = error as { code?: string; message?: string };
  const code = err?.code ?? "";
  const message = String(err?.message ?? "");

  if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code)) {
    return true;
  }

  if (message.includes("terminating connection due to administrator command")) {
    return true;
  }

  if (message.includes("Can't reach database server")) {
    return true;
  }

  if (message.includes("Connection timed out")) {
    return true;
  }

  if (
    message.includes("prepared statement") &&
    message.includes("does not exist")
  ) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrlOrThrow();

  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = databaseUrl;
  }

  const client = new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client.$extends({
    query: {
      async $allOperations({
        operation,
        args,
        query,
      }: {
        operation: string;
        args: unknown;
        query: (args: unknown) => Promise<unknown>;
      }) {
        const isReadOperation = READ_OPERATIONS.has(operation);
        const retryCount = isReadOperation ? 3 : 1;

        for (let retryAttempt = 0; retryAttempt <= retryCount; retryAttempt++) {
          try {
            return await query(args);
          } catch (error: unknown) {
            const isLastAttempt = retryAttempt === retryCount;

            if (!isConnectionError(error) || isLastAttempt) {
              throw error;
            }

            const backoffMs =
              150 * Math.pow(2, retryAttempt) + Math.floor(Math.random() * 50);

            if (process.env.NODE_ENV !== "production") {
              console.warn(
                `[Prisma] Retrying ${operation} after transient connection error ` +
                  `(retry ${retryAttempt + 1} of ${retryCount}, waiting ${backoffMs}ms)`
              );
            }

            await sleep(backoffMs);
          }
        }

        throw new Error("Prisma retry loop exited unexpectedly.");
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ExtendedPrismaClient;
};

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}