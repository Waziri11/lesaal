import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaAdapter?: PrismaPg;
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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
}
