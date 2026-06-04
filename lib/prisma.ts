import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
  dbInitState?: {
    isReady: boolean;
    promise: Promise<void> | null;
  };
  warnedMissingDatabaseUrl?: boolean;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

const fallbackConnectionString = "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable";
const connectionString = process.env.DATABASE_URL || fallbackConnectionString;

if (!process.env.DATABASE_URL && !globalForPrisma.warnedMissingDatabaseUrl) {
  console.warn(
    "DATABASE_URL is not set. Using fallback URL for build-time initialization. Set DATABASE_URL in deployment environment."
  );
  globalForPrisma.warnedMissingDatabaseUrl = true;
}

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
