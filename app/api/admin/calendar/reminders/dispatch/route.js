import { NextResponse } from "next/server";
import { advanceReminderSchedule, isMissingCalendarTableError } from "../../../../../../lib/calendar";
import { sendCalendarReminderEmail } from "../../../../../../lib/mailer";
import { ensureDatabaseReady, prisma } from "../../../../../../lib/prisma";

const DEFAULT_BATCH_SIZE = 200;

function isUniqueDeliveryError(error) {
  return error?.code === "P2002";
}

function parseBatchSize(searchParams) {
  const parsed = Number.parseInt(String(searchParams.get("limit") || DEFAULT_BATCH_SIZE), 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.max(1, Math.min(parsed, 500));
}

function isDispatchAuthorized(request) {
  const expectedSecret = String(process.env.CRON_SECRET || "").trim();

  if (!expectedSecret) {
    return false;
  }

  const bearer = String(request.headers.get("authorization") || "").trim();
  const headerSecret = String(request.headers.get("x-cron-secret") || "").trim();

  return bearer === `Bearer ${expectedSecret}` || headerSecret === expectedSecret;
}

function toDispatchSummary() {
  return {
    processedReminders: 0,
    deliveryCreated: 0,
    deliverySent: 0,
    deliveryFailed: 0,
    deliverySkipped: 0,
    duplicateDeliveries: 0,
  };
}

async function createInAppDelivery({ reminder, now }) {
  try {
    await prisma.calendarReminderDelivery.create({
      data: {
        adminId: reminder.item.adminId,
        itemId: reminder.itemId,
        reminderId: reminder.id,
        channel: "IN_APP",
        occurrenceStartAt: reminder.nextOccurrenceStartAt || reminder.item.startAt,
        triggeredAt: now,
        status: "SENT",
      },
    });

    return { created: true, sent: true, failed: false, skipped: false, duplicate: false };
  } catch (error) {
    if (isUniqueDeliveryError(error)) {
      return { created: false, sent: false, failed: false, skipped: true, duplicate: true };
    }

    throw error;
  }
}

async function createEmailDelivery({ reminder, now }) {
  const occurrenceStartAt = reminder.nextOccurrenceStartAt || reminder.item.startAt;
  const baseDurationMs = Math.max(
    60 * 1000,
    new Date(reminder.item.endAt).getTime() - new Date(reminder.item.startAt).getTime()
  );
  const occurrenceEndAt = new Date(new Date(occurrenceStartAt).getTime() + baseDurationMs);
  let deliveryRecord;

  try {
    deliveryRecord = await prisma.calendarReminderDelivery.create({
      data: {
        adminId: reminder.item.adminId,
        itemId: reminder.itemId,
        reminderId: reminder.id,
        channel: "EMAIL",
        occurrenceStartAt,
        triggeredAt: now,
        status: "SKIPPED",
        errorMessage: "Dispatch in progress",
      },
    });
  } catch (error) {
    if (isUniqueDeliveryError(error)) {
      return { created: false, sent: false, failed: false, skipped: true, duplicate: true };
    }

    throw error;
  }

  const recipient = String(reminder.item.admin?.email || "").trim();

  if (!recipient) {
    await prisma.calendarReminderDelivery.update({
      where: {
        id: deliveryRecord.id,
      },
      data: {
        status: "SKIPPED",
        errorMessage: "Missing recipient email.",
      },
    });

    return { created: true, sent: false, failed: false, skipped: true, duplicate: false };
  }

  try {
    const mailResult = await sendCalendarReminderEmail({
      to: recipient,
      title: reminder.item.title,
      itemType: reminder.item.type,
      startAt: occurrenceStartAt,
      endAt: occurrenceEndAt,
      location: reminder.item.location,
      description: reminder.item.description,
      timeZone: reminder.item.timezone,
      minutesBefore: reminder.minutesBefore,
    });

    if (mailResult?.delivered) {
      await prisma.calendarReminderDelivery.update({
        where: {
          id: deliveryRecord.id,
        },
        data: {
          status: "SENT",
          errorMessage: null,
        },
      });

      return { created: true, sent: true, failed: false, skipped: false, duplicate: false };
    }

    const status = mailResult?.reason === "SMTP_NOT_CONFIGURED" ? "SKIPPED" : "FAILED";
    const message = mailResult?.reason || "Email delivery failed.";

    await prisma.calendarReminderDelivery.update({
      where: {
        id: deliveryRecord.id,
      },
      data: {
        status,
        errorMessage: message,
      },
    });

    return {
      created: true,
      sent: false,
      failed: status === "FAILED",
      skipped: status === "SKIPPED",
      duplicate: false,
    };
  } catch (error) {
    await prisma.calendarReminderDelivery.update({
      where: {
        id: deliveryRecord.id,
      },
      data: {
        status: "FAILED",
        errorMessage: String(error?.message || "Email delivery failed."),
      },
    });

    return { created: true, sent: false, failed: true, skipped: false, duplicate: false };
  }
}

function computeNextReminderState(reminder, now) {
  let cursorReminder = {
    minutesBefore: reminder.minutesBefore,
    nextOccurrenceStartAt: reminder.nextOccurrenceStartAt,
  };
  let next = advanceReminderSchedule(reminder.item, cursorReminder, now);
  let guard = 0;

  while (next && next.nextTriggerAt.getTime() <= now.getTime() && guard < 100) {
    cursorReminder = {
      minutesBefore: reminder.minutesBefore,
      nextOccurrenceStartAt: next.nextOccurrenceStartAt,
    };
    next = advanceReminderSchedule(reminder.item, cursorReminder, now);
    guard += 1;
  }

  return next;
}

export async function POST(request) {
  try {
    if (!isDispatchAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDatabaseReady();

    const now = new Date();
    const batchSize = parseBatchSize(request.nextUrl.searchParams);

    const dueReminders = await prisma.calendarItemReminder.findMany({
      where: {
        nextTriggerAt: {
          lte: now,
        },
      },
      orderBy: [{ nextTriggerAt: "asc" }, { id: "asc" }],
      take: batchSize,
      include: {
        item: {
          select: {
            id: true,
            adminId: true,
            type: true,
            title: true,
            description: true,
            location: true,
            startAt: true,
            endAt: true,
            allDay: true,
            timezone: true,
            isCompleted: true,
            recurrenceRule: true,
            admin: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const summary = toDispatchSummary();

    for (const reminder of dueReminders) {
      summary.processedReminders += 1;

      if (!reminder.item || (reminder.item.type === "TASK" && reminder.item.isCompleted)) {
        await prisma.calendarItemReminder.update({
          where: { id: reminder.id },
          data: {
            nextTriggerAt: null,
            nextOccurrenceStartAt: null,
          },
        });

        summary.deliverySkipped += 1;
        continue;
      }

      for (const channel of reminder.channels) {
        if (channel === "IN_APP") {
          const result = await createInAppDelivery({ reminder, now });
          if (result.created) summary.deliveryCreated += 1;
          if (result.sent) summary.deliverySent += 1;
          if (result.failed) summary.deliveryFailed += 1;
          if (result.skipped) summary.deliverySkipped += 1;
          if (result.duplicate) summary.duplicateDeliveries += 1;
          continue;
        }

        if (channel === "EMAIL") {
          const result = await createEmailDelivery({ reminder, now });
          if (result.created) summary.deliveryCreated += 1;
          if (result.sent) summary.deliverySent += 1;
          if (result.failed) summary.deliveryFailed += 1;
          if (result.skipped) summary.deliverySkipped += 1;
          if (result.duplicate) summary.duplicateDeliveries += 1;
        }
      }

      const next = computeNextReminderState(reminder, now);

      await prisma.calendarItemReminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          nextTriggerAt: next?.nextTriggerAt || null,
          nextOccurrenceStartAt: next?.nextOccurrenceStartAt || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      now,
      batchSize,
      ...summary,
    });
  } catch (error) {
    console.error("Calendar reminder dispatch failed", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        {
          success: true,
          processedReminders: 0,
          deliveryCreated: 0,
          deliverySent: 0,
          deliveryFailed: 0,
          deliverySkipped: 0,
          duplicateDeliveries: 0,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Unable to dispatch calendar reminders." }, { status: 500 });
  }
}
