import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import {
  buildReminderRecordsForItem,
  isMissingCalendarTableError,
  normalizeCalendarItemInput,
} from "../../../../../../lib/calendar";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../../lib/request-security";

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

async function loadItemForAdmin(adminId, itemId) {
  return prisma.calendarItem.findFirst({
    where: {
      id: itemId,
      adminId,
    },
    include: {
      reminders: true,
    },
  });
}

export async function GET(request, { params }) {
  try {
    await ensureDatabaseReady();

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const itemId = String(resolvedParams?.itemId || "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "Item id is required." }, { status: 400 });
    }

    const item = await loadItemForAdmin(admin.id, itemId);

    if (!item) {
      return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: serializeCalendarItem(item) });
  } catch (error) {
    console.error("Failed to fetch calendar item", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        { error: "Calendar is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to load calendar item." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
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

    const resolvedParams = await params;
    const itemId = String(resolvedParams?.itemId || "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "Item id is required." }, { status: 400 });
    }

    const existing = await loadItemForAdmin(admin.id, itemId);

    if (!existing) {
      return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    }

    const body = await request.json();
    const input = normalizeCalendarItemInput(body);
    const reminders = buildReminderRecordsForItem(input, input.reminders, new Date());

    const item = await prisma.calendarItem.update({
      where: {
        id: existing.id,
      },
      data: {
        ...buildItemWriteData(input),
        reminders: {
          deleteMany: {},
          ...(reminders.length
            ? {
                create: reminders,
              }
            : {}),
        },
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

    console.error("Failed to update calendar item", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        { error: "Calendar is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to update calendar item." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    const resolvedParams = await params;
    const itemId = String(resolvedParams?.itemId || "").trim();

    if (!itemId) {
      return NextResponse.json({ error: "Item id is required." }, { status: 400 });
    }

    const existing = await loadItemForAdmin(admin.id, itemId);

    if (!existing) {
      return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    }

    await prisma.calendarItem.delete({
      where: {
        id: existing.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete calendar item", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        { error: "Calendar is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to delete calendar item." }, { status: 500 });
  }
}
