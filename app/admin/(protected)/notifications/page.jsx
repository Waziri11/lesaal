"use client";

import { useEffect, useState } from "react";
import PageState from "../../../../components/shared/PageState";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { createCsrfHeaders } from "../../../../lib/csrf-client";

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load notifications.");
      }

      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      setUnreadCount(Number(payload.unreadCount || 0));
    } catch (requestError) {
      setError(requestError.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId = null) {
    if (updating) return;

    setUpdating(true);
    setError("");

    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(notificationId ? { notificationId } : {}),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update notifications.");
      }

      setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      setUnreadCount(Number(payload.unreadCount || 0));
    } catch (requestError) {
      setError(requestError.message || "Unable to update notifications.");
    } finally {
      setUpdating(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Track campaign responses as they arrive.</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={unreadCount > 0 ? "secondary" : "default"}>{unreadCount} unread</Badge>
            <Button type="button" variant="outline" onClick={() => markAsRead()} disabled={updating || unreadCount === 0}>
              {updating ? "Updating..." : "Mark all as read"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <PageState
        status={loading ? "loading" : error ? "error" : !notifications.length ? "empty" : "loaded"}
        resourceLabel="notifications"
        errorMessage={error}
        onRetry={loadNotifications}
      >
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.isRead ? "" : "border-[color:var(--ui-primary)]"}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{notification.title}</CardTitle>
                  <CardDescription>{notification.message}</CardDescription>
                </div>

                {!notification.isRead ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => markAsRead(notification.id)} disabled={updating}>
                    Mark as read
                  </Button>
                ) : (
                  <Badge>Read</Badge>
                )}
              </CardHeader>

              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--ui-muted-foreground)]">
                <span>Received: {formatDateTime(notification.createdAt)}</span>
                {notification.campaign ? (
                  <Button asChild variant="ghost" size="sm">
                    <a href={`/campaigns/${notification.campaign.slug}`} target="_blank" rel="noreferrer">
                      Open public campaign
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </PageState>
    </div>
  );
}
