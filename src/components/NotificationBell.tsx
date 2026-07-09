import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { listMyNotificationsFn, markNotificationReadFn } from "@/lib/api/notification.functions";
import { useAuth } from "@/lib/auth-context";
import type { Notification } from "@/lib/types/notification";

export function NotificationBell() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
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
      if (!authHeaders) {
        return;
      }

      try {
        const result = await listMyNotificationsFn({
          headers: authHeaders,
        });

        if (mounted) {
          setNotifications(result.notifications);
          setErrorMessage("");
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load notifications.");
        }
      }
    }

    void loadNotifications();

    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const latestNotifications = notifications.slice(0, 5);

  async function onNotificationClick(notification: Notification) {
    if (!authHeaders || notification.isRead) {
      setIsOpen(false);
      return;
    }

    try {
      const result = await markNotificationReadFn({
        data: { id: notification.id },
        headers: authHeaders,
      });

      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? result.notification : item)),
      );
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to mark notification read.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-[#1DA1F2]/10 hover:text-[#0B3D91]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold leading-5 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_40px_-24px_rgba(11,61,145,0.45)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-heading font-bold text-[#0B3D91]">Notifications</h2>
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#1DA1F2] hover:text-[#0B3D91]"
            >
              View all
            </Link>
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {errorMessage}
            </p>
          ) : latestNotifications.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {latestNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void onNotificationClick(notification)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    notification.isRead
                      ? "border-[#E5E7EB] bg-white hover:bg-slate-50"
                      : "border-[#1DA1F2]/30 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/15"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{notification.message}</p>
                  <p className="mt-2 text-[11px] font-medium text-slate-400">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
