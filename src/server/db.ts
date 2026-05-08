import { PrismaClient } from "@prisma/client";
import { recordObservedQuery } from "@/server/observability";

const shouldEmitQueryEvents = process.env.ENABLE_SERVER_TIMING === "1";

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: "stdout" as const, level: "error" as const },
      ...(process.env.NODE_ENV === "development"
        ? [{ emit: "stdout" as const, level: "warn" as const }]
        : []),
    ],
  });

  if (!shouldEmitQueryEvents) {
    return client;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startedAt = performance.now();
          try {
            return await query(args);
          } finally {
            recordObservedQuery({
              label: `${operation.toUpperCase()} ${model ?? "raw"}`,
              durationMs: performance.now() - startedAt,
              target: "prisma_extension",
            });
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
