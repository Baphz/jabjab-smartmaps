// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
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
