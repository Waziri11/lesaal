import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { isMissingCalendarTableError } from "../../../../../lib/calendar";
import { ensureDatabaseReady, prisma } from "../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../lib/request-security";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parsePagination(searchParams) {
  const parsedLimit = Number.parseInt(String(searchParams.get("limit") || DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const cursor = String(searchParams.get("cursor") || "").trim() || null;

  return {
    limit,
    cursor,
  };
}

function serializeAlert(delivery) {
  return {
    id: delivery.id,
    reminderId: delivery.reminderId,
    itemId: delivery.itemId,
    channel: delivery.channel,
    status: delivery.status,
    errorMessage: delivery.errorMessage,
    occurrenceStartAt: delivery.occurrenceStartAt,
    triggeredAt: delivery.triggeredAt,
    readAt: delivery.readAt,
    createdAt: delivery.createdAt,
    item: delivery.item
      ? {
          id: delivery.item.id,
          type: delivery.item.type,
          title: delivery.item.title,
          startAt: delivery.item.startAt,
          endAt: delivery.item.endAt,
          allDay: delivery.item.allDay,
          color: delivery.item.color,
        }
      : null,
  };
}

export async function GET(request) {
  try {
    await ensureDatabaseReady();

    const admin = await getAdminFromApiRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pagination = parsePagination(request.nextUrl.searchParams);

    const pageRows = await prisma.calendarReminderDelivery.findMany({
      where: {
        adminId: admin.id,
        channel: "IN_APP",
        status: "SENT",
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pagination.limit + 1,
      cursor: pagination.cursor ? { id: pagination.cursor } : undefined,
      skip: pagination.cursor ? 1 : 0,
      include: {
        item: {
          select: {
            id: true,
            type: true,
            title: true,
            startAt: true,
            endAt: true,
            allDay: true,
            color: true,
          },
        },
      },
    });

    const hasMore = pageRows.length > pagination.limit;
    const deliveries = hasMore ? pageRows.slice(0, pagination.limit) : pageRows;
    const nextCursor = hasMore ? deliveries[deliveries.length - 1]?.id || null : null;

    const unreadCount = await prisma.calendarReminderDelivery.count({
      where: {
        adminId: admin.id,
        channel: "IN_APP",
        status: "SENT",
        readAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
      alerts: deliveries.map(serializeAlert),
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("Failed to load reminder alerts", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json(
        {
          success: true,
          unreadCount: 0,
          alerts: [],
          hasMore: false,
          nextCursor: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Unable to load reminder alerts." }, { status: 500 });
  }
}

export async function PATCH(request) {
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
    const alertId = String(body?.alertId || "").trim() || null;

    if (alertId) {
      await prisma.calendarReminderDelivery.updateMany({
        where: {
          id: alertId,
          adminId: admin.id,
          channel: "IN_APP",
          status: "SENT",
        },
        data: {
          readAt: new Date(),
        },
      });
    } else {
      await prisma.calendarReminderDelivery.updateMany({
        where: {
          adminId: admin.id,
          channel: "IN_APP",
          status: "SENT",
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    }

    const unreadCount = await prisma.calendarReminderDelivery.count({
      where: {
        adminId: admin.id,
        channel: "IN_APP",
        status: "SENT",
        readAt: null,
      },
    });

    return NextResponse.json({ success: true, unreadCount, alertId });
  } catch (error) {
    console.error("Failed to mark reminder alerts as read", error);

    if (isMissingCalendarTableError(error)) {
      return NextResponse.json({ success: true, unreadCount: 0, alertId: null });
    }

    return NextResponse.json({ error: "Unable to update reminder alerts." }, { status: 500 });
  }
}
