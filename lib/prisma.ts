import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { requireEnv } from "./env";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
  dbInitState?: {
    isReady: boolean;
    promise: Promise<void> | null;
  };
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

const connectionString = requireEnv("DATABASE_URL");

const adapter = globalForPrisma.prismaAdapter ?? new PrismaPg({ connectionString });

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

const dbInitState = globalForPrisma.dbInitState ?? {
  isReady: false,
  promise: null as Promise<void> | null,
};

export async function ensureDatabaseReady() {
  if (dbInitState.isReady) {
    return;
  }

  if (!dbInitState.promise) {
    dbInitState.promise = basePrisma
      .$queryRawUnsafe("SELECT 1")
      .then(() => {
        dbInitState.isReady = true;
      })
      .catch((error) => {
        dbInitState.isReady = false;
        throw error;
      })
      .finally(() => {
        dbInitState.promise = null;
      });
  }

  await dbInitState.promise;
}

export const prisma = basePrisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
  globalForPrisma.dbInitState = dbInitState;
}
