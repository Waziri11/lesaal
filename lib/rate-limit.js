import { ensureDatabaseReady, prisma } from "./prisma";

function getWindowStart(now, windowMs) {
  const timestamp = now.getTime();
  const windowStartTimestamp = Math.floor(timestamp / windowMs) * windowMs;
  return new Date(windowStartTimestamp);
}

function secondsUntil(targetDate, now) {
  const milliseconds = targetDate.getTime() - now.getTime();
  return Math.max(1, Math.ceil(milliseconds / 1000));
}

function getWindowResetAt(windowStart, windowMs) {
  return new Date(windowStart.getTime() + windowMs);
}

function isMissingRateLimitTableError(error) {
  if (!error) return false;
  if (error?.code === "P2021" || error?.code === "P2022") return true;
  const message = String(error?.message || "").toLowerCase();
  return message.includes("ratelimitentry") && message.includes("does not exist");
}

let hasWarnedMissingRateLimitTable = false;

export async function consumeRateLimit({ key, limit, windowMs, lockMs = 0 }) {
  await ensureDatabaseReady();

  const now = new Date();
  const windowStart = getWindowStart(now, windowMs);

  try {
    return await prisma.$transaction(async (tx) => {
      let entry = await tx.rateLimitEntry.findUnique({ where: { key } });

      if (!entry) {
        entry = await tx.rateLimitEntry.create({
          data: {
            key,
            count: 0,
            windowStart,
          },
        });
      }

      if (entry.lockedUntil && entry.lockedUntil > now) {
        return {
          allowed: false,
          retryAfterSeconds: secondsUntil(entry.lockedUntil, now),
          remaining: 0,
        };
      }

      let nextCount = entry.count;
      let nextWindowStart = entry.windowStart;

      if (entry.windowStart.getTime() !== windowStart.getTime()) {
        nextCount = 0;
        nextWindowStart = windowStart;
      }

      nextCount += 1;

      const exceeded = nextCount > limit;
      const lockedUntil = exceeded && lockMs > 0 ? new Date(now.getTime() + lockMs) : null;

      await tx.rateLimitEntry.update({
        where: { id: entry.id },
        data: {
          count: nextCount,
          windowStart: nextWindowStart,
          lockedUntil,
        },
      });

      if (exceeded) {
        return {
          allowed: false,
          retryAfterSeconds:
            lockMs > 0 && lockedUntil
              ? secondsUntil(lockedUntil, now)
              : secondsUntil(getWindowResetAt(nextWindowStart, windowMs), now),
          remaining: 0,
        };
      }

      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: Math.max(0, limit - nextCount),
      };
    });
  } catch (error) {
    if (!isMissingRateLimitTableError(error)) {
      throw error;
    }

    if (!hasWarnedMissingRateLimitTable) {
      console.warn(
        "RateLimitEntry table is missing. Rate limiting is temporarily disabled until migrations are applied."
      );
      hasWarnedMissingRateLimitTable = true;
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: limit,
    };
  }
}

export async function clearRateLimit(key) {
  await ensureDatabaseReady();
  try {
    await prisma.rateLimitEntry.deleteMany({ where: { key } });
  } catch (error) {
    if (!isMissingRateLimitTableError(error)) {
      throw error;
    }
  }
}
