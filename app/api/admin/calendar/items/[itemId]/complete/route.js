import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../../lib/auth";
import { getNextReminderSchedule, isMissingCalendarTableError } from "../../../../../../../lib/calendar";
import { ensureDatabaseReady, prisma } from "../../../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../../../lib/request-security";

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

export async function PATCH(request, { params }) {
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

    const body = await request.json();
    const isCompleted = Boolean(body?.isCompleted);

    const existing = await loadItemForAdmin(admin.id, itemId);

    if (!existing) {
      return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    }

    if (existing.type !== "TASK") {
      return NextResponse.json({ error: "Only task items can be marked complete." }, { status: 400 });
    }

    const updatedItem = await prisma.$transaction(async (transaction) => {
      await transaction.calendarItem.update({
        where: { id: existing.id },
        data: {
          isCompleted,
        },
      });

      if (isCompleted) {
        await transaction.calendarItemReminder.updateMany({
          where: { itemId: existing.id },
          data: {
            nextTriggerAt: null,
            nextOccurrenceStartAt: null,
          },
        });
      } else {
        for (const reminder of existing.reminders) {
          const next = getNextReminderSchedule(
            {
              ...existing,
              isCompleted: false,
            },
            reminder.minutesBefore,
            new Date()
          );

          await transaction.calendarItemReminder.update({
            where: { id: reminder.id },
            data: {
              nextTriggerAt: next?.nextTriggerAt || null,
              nextOccurrenceStartAt: next?.nextOccurrenceStartAt || null,
            },
          });
        }
      }

      return transaction.calendarItem.findUnique({
        where: { id: existing.id },
        include: { reminders: true },
      });
    });

    if (!updatedItem) {
      return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: serializeCalendarItem(updatedItem) });
  } catch (error) {
    console.error("Failed to update task completion", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        { error: "Calendar is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Unable to update task completion." }, { status: 500 });
  }
}
