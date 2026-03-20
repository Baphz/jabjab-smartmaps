// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getRuntimeDatasourceUrl() {
  const rawUrl = process.env.DATABASE_URL?.trim();

  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);
    const isVercelRuntime = process.env.VERCEL === "1";
    const isProduction = process.env.NODE_ENV === "production";
    const isSupabasePooler = url.hostname.includes("pooler.supabase.com");
    const isPooledConnection =
      isSupabasePooler || url.searchParams.get("pgbouncer") === "true";

    // Serverless runtimes should keep Prisma's connection usage extremely small.
    if ((isVercelRuntime || isProduction) && isPooledConnection) {
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }

      if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set("pool_timeout", "20");
      }

      if (isSupabasePooler && !url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: getRuntimeDatasourceUrl(),
    log: ["error", "warn"],
  });
}

function isCompatiblePrismaClient(client: PrismaClient | undefined) {
  if (!client) {
    return false;
  }

  const requiredDelegates = [
    "lab",
    "labType",
    "labEvent",
    "masterHoliday",
    "article",
    "appSettings",
  ] as const;

  const clientRecord = client as unknown as Record<string, unknown>;

  return requiredDelegates.every((key) => typeof clientRecord[key] !== "undefined");
}

const existingPrisma = globalForPrisma.prisma;

if (existingPrisma && !isCompatiblePrismaClient(existingPrisma)) {
  existingPrisma.$disconnect().catch(() => {
    // Ignore disconnect errors from stale dev clients.
  });
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
