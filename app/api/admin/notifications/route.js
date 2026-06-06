import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { isCampaignTableMissingError } from "../../../../lib/campaigns";
import { ensureDatabaseReady, prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

const DEFAULT_PAGE_LIMIT = 40;
const MAX_PAGE_LIMIT = 100;

function serializeNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    readAt: notification.readAt,
    payload: notification.payload || {},
    campaign: notification.campaign
      ? {
          id: notification.campaign.id,
          title: notification.campaign.title,
          slug: notification.campaign.slug,
        }
      : null,
    campaignResponse: notification.campaignResponse
      ? {
          id: notification.campaignResponse.id,
          submittedAt: notification.campaignResponse.submittedAt,
        }
      : null,
    createdAt: notification.createdAt,
  };
}

function parsePaginationParams(searchParams) {
  const parsedLimit = Number.parseInt(String(searchParams.get("limit") || DEFAULT_PAGE_LIMIT), 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const cursor = String(searchParams.get("cursor") || "").trim() || null;
  return { limit, cursor };
}

async function loadNotifications({ limit, cursor }) {
  const pageRows = await prisma.adminNotification.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      campaignResponse: {
        select: {
          id: true,
          submittedAt: true,
        },
      },
    },
  });
  const hasMore = pageRows.length > limit;
  const notifications = hasMore ? pageRows.slice(0, limit) : pageRows;
  const nextCursor = hasMore ? notifications[notifications.length - 1]?.id || null : null;

  const unreadCount = await prisma.adminNotification.count({
    where: { isRead: false },
  });

  return {
    unreadCount,
    notifications: notifications.map(serializeNotification),
    nextCursor,
    hasMore,
  };
}

export async function GET(request) {
  try {
    await ensureDatabaseReady();

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pagination = parsePaginationParams(request.nextUrl.searchParams);
    return NextResponse.json(await loadNotifications(pagination));
  } catch (error) {
    console.error("Failed to load notifications", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ notifications: [], unreadCount: 0, nextCursor: null, hasMore: false });
    }

    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
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
    const notificationId = body?.notificationId ? String(body.notificationId) : null;

    if (notificationId) {
      await prisma.adminNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    const unreadCount = await prisma.adminNotification.count({
      where: { isRead: false },
    });

    return NextResponse.json({ success: true, unreadCount, notificationId: notificationId || null });
  } catch (error) {
    console.error("Failed to update notifications", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ success: true, unreadCount: 0, notificationId: null });
    }

    return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}
