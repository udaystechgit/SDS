import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  listMyNotificationsFn,
  markAllNotificationsReadFn,
  markNotificationReadFn,
} from "@/lib/api/notification.functions";
import { getHomeRouteForRole } from "@/lib/auth-roles";
import { useAuth } from "@/lib/auth-context";
import type { Notification } from "@/lib/types/notification";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { role, session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const authHeaders = useMemo(() => {
    if (!session?.access_token) {
      return null;
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session?.access_token]);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!authHeaders) {
          throw new Error("Authentication is required.");
        }

        const result = await listMyNotificationsFn({
          headers: authHeaders,
        });

        if (mounted) {
          setNotifications(result.notifications);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load notifications.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const homeRoute = role ? getHomeRouteForRole(role) : "/";

  async function onMarkRead(notification: Notification) {
    if (!authHeaders || notification.isRead) {
      return;
    }

    setMarkingId(notification.id);
    setErrorMessage("");

    try {
      const result = await markNotificationReadFn({
        data: { id: notification.id },
        headers: authHeaders,
      });

      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? result.notification : item)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to mark notification read.");
    } finally {
      setMarkingId(null);
    }
  }

  async function onMarkAllRead() {
    if (!authHeaders) {
      return;
    }

    setIsMarkingAll(true);
    setErrorMessage("");

    try {
      await markAllNotificationsReadFn({
        headers: authHeaders,
      });

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to mark notifications read.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to={homeRoute}
          className="inline-flex text-sm font-semibold text-[#1DA1F2] transition hover:text-[#0B3D91]"
        >
          Back to Portal
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
              Notifications
            </p>
            <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">
              Notification Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review workflow updates and mark messages as read.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onMarkAllRead()}
            disabled={isMarkingAll || unreadCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1DA1F2]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            {isMarkingAll ? "Marking..." : "Mark All Read"}
          </button>
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91]">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-heading font-bold text-[#0B3D91]">
                Latest Notifications
              </h2>
              <p className="text-sm text-slate-600">{unreadCount} unread</p>
            </div>
          </div>

          {isLoading ? (
            <StatusPanel message="Loading notifications..." />
          ) : errorMessage ? (
            <StatusPanel message={errorMessage} tone="error" />
          ) : notifications.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#BFD7F8] bg-[#F4F8FF] p-8 text-center">
              <p className="text-sm font-semibold text-[#0B3D91]">No notifications yet.</p>
              <p className="mt-2 text-sm text-slate-600">
                Workflow updates will appear here when they are available.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${
                    notification.isRead
                      ? "border-[#E5E7EB] bg-white"
                      : "border-[#1DA1F2]/30 bg-[#1DA1F2]/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={() => void onMarkRead(notification)}
                        disabled={markingId === notification.id}
                        className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {markingId === notification.id ? "Marking..." : "Mark Read"}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function StatusPanel({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={`mt-5 rounded-2xl border p-5 text-sm font-medium ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#E5E7EB] bg-white text-[#0B3D91]"
      }`}
    >
      {message}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
