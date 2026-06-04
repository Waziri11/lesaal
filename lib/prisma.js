import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = globalForPrisma.prismaAdapter || new PrismaPg({ connectionString });

const basePrisma =
  globalForPrisma.basePrismaClient ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const dbInitState = globalForPrisma.dbInitState || {
  isReady: false,
  promise: null,
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
  globalForPrisma.basePrismaClient = basePrisma;
  globalForPrisma.prismaAdapter = adapter;
  globalForPrisma.dbInitState = dbInitState;
}
