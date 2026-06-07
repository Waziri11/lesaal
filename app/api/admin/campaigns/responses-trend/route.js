import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { isCampaignTableMissingError } from "../../../../../lib/campaigns";
import { prisma } from "../../../../../lib/prisma";

const DEFAULT_DAYS = 30;
const MIN_DAYS = 7;
const MAX_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function clampDays(value) {
  const parsed = Number.parseInt(String(value ?? DEFAULT_DAYS), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_DAYS;
  return Math.max(MIN_DAYS, Math.min(MAX_DAYS, parsed));
}

function startOfUtcDay(date) {
  const current = date instanceof Date ? date : new Date(date);
  return new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
}

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = clampDays(searchParams.get("days"));
    const endDay = startOfUtcDay(new Date());
    const startDay = addUtcDays(endDay, -(days - 1));
    const endOfRange = new Date(endDay.getTime() + DAY_MS - 1);

    const rows = await prisma.campaignResponse.findMany({
      where: {
        submittedAt: {
          gte: startDay,
          lte: endOfRange,
        },
      },
      select: {
        submittedAt: true,
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    const countsByDate = new Map();

    for (let index = 0; index < days; index += 1) {
      const day = addUtcDays(startDay, index);
      countsByDate.set(dateKey(day), 0);
    }

    for (const row of rows) {
      const key = dateKey(startOfUtcDay(row.submittedAt));
      countsByDate.set(key, Number(countsByDate.get(key) || 0) + 1);
    }

    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const series = [];
    let totalResponses = 0;

    for (let index = 0; index < days; index += 1) {
      const day = addUtcDays(startDay, index);
      const key = dateKey(day);
      const count = Number(countsByDate.get(key) || 0);
      totalResponses += count;
      series.push({
        date: key,
        label: formatter.format(day),
        count,
      });
    }

    return NextResponse.json(
      {
        range: {
          days,
          start: dateKey(startDay),
          end: dateKey(endDay),
        },
        totalResponses,
        series,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to load campaign response trend", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json(
        {
          range: {
            days: DEFAULT_DAYS,
            start: null,
            end: null,
          },
          totalResponses: 0,
          series: [],
          warning: "Campaign tables are not initialized yet.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json({ error: "Unable to load campaign response trend." }, { status: 500 });
  }
}
