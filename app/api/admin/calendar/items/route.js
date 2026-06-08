import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import {
  buildReminderRecordsForItem,
  CALENDAR_ITEM_TYPES,
  isMissingCalendarTableError,
  normalizeCalendarItemInput,
} from "../../../../../lib/calendar";
import { ensureDatabaseReady, prisma } from "../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../lib/request-security";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || fallback), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function parseDateSearchParam(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTypeFilter(searchParams) {
  const raw = String(searchParams.get("types") || "").trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((token) => token.trim().toUpperCase())
    .filter((token) => CALENDAR_ITEM_TYPES.includes(token));
}

function parseStatusFilter(searchParams) {
  const status = String(searchParams.get("status") || "all")
    .trim()
    .toLowerCase();

  if (status === "completed" || status === "open") {
    return status;
  }

  return "all";
}

function buildCalendarWhereClause(adminId, searchParams) {
  const from = parseDateSearchParam(searchParams.get("from"));
  const to = parseDateSearchParam(searchParams.get("to"));
  const q = String(searchParams.get("q") || "").trim();
  const types = parseTypeFilter(searchParams);
  const status = parseStatusFilter(searchParams);

  const where = {
    adminId,
    AND: [],
  };

  if (types.length) {
    where.type = {
      in: types,
    };
  }

  if (status === "completed") {
    where.AND.push({
      type: "TASK",
      isCompleted: true,
    });
  }

  if (status === "open") {
    where.AND.push({
      OR: [{ type: { not: "TASK" } }, { isCompleted: false }],
    });
  }

  if (q) {
    where.AND.push({
      OR: [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: q,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (from || to) {
    const overlap = {};

    if (from) {
      overlap.endAt = { gt: from };
    }

    if (to) {
      overlap.startAt = { lt: to };
    }

    where.AND.push({
      OR: [{ recurrenceRule: { not: null } }, overlap],
    });
  }

  if (!where.AND.length) {
    delete where.AND;
  }

  return where;
}

function serializeCalendarItem(item) {
  return {
    id: item.id,
    adminId: item.adminId,
    type: item.type,
    title: item.title,
    description: item.description,
    location: item.location,
    color: item.color,
    startAt: item.startAt,
    endAt: item.endAt,
    allDay: item.allDay,
    timezone: item.timezone,
    isCompleted: item.isCompleted,
    recurrenceRule: item.recurrenceRule,
    reminders: Array.isArray(item.reminders)
      ? item.reminders
          .slice()
          .sort((left, right) => left.minutesBefore - right.minutesBefore)
          .map((reminder) => ({
            id: reminder.id,
            minutesBefore: reminder.minutesBefore,
            channels: reminder.channels,
            nextTriggerAt: reminder.nextTriggerAt,
            nextOccurrenceStartAt: reminder.nextOccurrenceStartAt,
            createdAt: reminder.createdAt,
            updatedAt: reminder.updatedAt,
          }))
      : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildItemWriteData(input) {
  return {
    type: input.type,
    title: input.title,
    description: input.description,
    location: input.location,
    color: input.color,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay,
    timezone: input.timezone,
    isCompleted: input.isCompleted,
    recurrenceRule: input.recurrenceRule,
  };
}

export async function GET(request) {
  try {
    await ensureDatabaseReady();

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const where = buildCalendarWhereClause(admin.id, searchParams);
    const limit = parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT);

    const items = await prisma.calendarItem.findMany({
      where,
      take: limit,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      include: {
        reminders: true,
      },
    });

    return NextResponse.json({
      success: true,
      items: items.map(serializeCalendarItem),
    });
  } catch (error) {
    console.error("Failed to load calendar items", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        { error: "Calendar is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to load calendar items." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    await ensureDatabaseReady();

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input = normalizeCalendarItemInput(body);
    const reminders = buildReminderRecordsForItem(input, input.reminders, new Date());

    const item = await prisma.calendarItem.create({
      data: {
        adminId: admin.id,
        ...buildItemWriteData(input),
        reminders: reminders.length
          ? {
              create: reminders,
            }
          : undefined,
      },
      include: {
        reminders: true,
      },
    });

    return NextResponse.json({ success: true, item: serializeCalendarItem(item) });
  } catch (error) {
    if (error instanceof Error && /required|invalid|must/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to create calendar item", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        { error: "Calendar is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to create calendar item." }, { status: 500 });
  }
}
