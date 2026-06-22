import { prisma } from "./prisma";

let cachedAdminId = "";
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 60 * 1000;

export async function resolveNotificationAdminId(preferredAdminId = "") {
  const normalizedPreferred = String(preferredAdminId || "").trim();
  if (normalizedPreferred) {
    return normalizedPreferred;
  }

  const now = Date.now();
  if (cachedAdminId && cacheExpiresAt > now) {
    return cachedAdminId;
  }

  const admin = await prisma.adminUser.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  cachedAdminId = String(admin?.id || "").trim();
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedAdminId;
}
