"use client";

import { useEffect, useState } from "react";

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
        headers: {
          "Content-Type": "application/json",
        },
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
    <section className="notification-shell">
      <article className="admin-page-card notification-head-card">
        <h1>Notifications</h1>
        <p>Track campaign responses as they arrive and keep your inbox organized.</p>

        <div className="notification-head-actions">
          <span className="status-pill">{unreadCount} unread</span>
          <button type="button" onClick={() => markAsRead()} disabled={updating || unreadCount === 0}>
            {updating ? "Updating..." : "Mark all as read"}
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
      </article>

      <div className="notification-list">
        {loading ? <article className="admin-page-card"><p>Loading notifications...</p></article> : null}

        {!loading && !notifications.length ? (
          <article className="admin-page-card">
            <h2>No notifications yet</h2>
            <p>New campaign responses will appear here.</p>
          </article>
        ) : null}

        {!loading
          ? notifications.map((notification) => (
              <article
                key={notification.id}
                className={`admin-page-card notification-item${notification.isRead ? "" : " is-unread"}`}
              >
                <div className="notification-item-head">
                  <div>
                    <h2>{notification.title}</h2>
                    <p>{notification.message}</p>
                  </div>

                  {!notification.isRead ? (
                    <button type="button" onClick={() => markAsRead(notification.id)} disabled={updating}>
                      Mark as read
                    </button>
                  ) : (
                    <span className="section-type-pill">Read</span>
                  )}
                </div>

                <div className="notification-item-meta">
                  <span>Received: {formatDateTime(notification.createdAt)}</span>
                  {notification.campaign ? (
                    <a href={`/campaigns/${notification.campaign.slug}`} target="_blank" rel="noreferrer">
                      Open public campaign
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          : null}
      </div>
    </section>
  );
}
