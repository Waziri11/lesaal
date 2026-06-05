import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { isCampaignTableMissingError } from "../../../../lib/campaigns";
import { ensureDatabaseReady, prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

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

async function loadNotifications() {
  const notifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
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

  const unreadCount = await prisma.adminNotification.count({
    where: { isRead: false },
  });

  return {
    unreadCount,
    notifications: notifications.map(serializeNotification),
  };
}

export async function GET(request) {
  try {
    await ensureDatabaseReady();

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await loadNotifications());
  } catch (error) {
    console.error("Failed to load notifications", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
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

    return NextResponse.json({ success: true, ...(await loadNotifications()) });
  } catch (error) {
    console.error("Failed to update notifications", error);

    if (isCampaignTableMissingError(error)) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}
