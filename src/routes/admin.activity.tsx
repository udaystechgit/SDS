import { createFileRoute } from "@tanstack/react-router";
import { Activity, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { listAuditEventsForEntity } from "@/lib/api/audit.functions";
import { useAuth } from "@/lib/auth-context";
import type { AuditAction, AuditEntityType, AuditEvent } from "@/lib/types/audit";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivityPage,
});

const entityTypeOptions: Array<{ value: AuditEntityType; label: string }> = [
  { value: "timesheet", label: "Timesheets" },
  { value: "leave_request", label: "Leave Requests" },
  { value: "employee", label: "Employees" },
];

const actionOptions: AuditAction[] = [
  "created",
  "updated",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
  "linked_auth_user",
];

function AdminActivityPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
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

    async function loadEvents() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!authHeaders) {
          throw new Error("Authentication is required.");
        }

        const result = await listAuditEventsForEntity({
          data: {
            entityType: entityType === "all" ? undefined : entityType,
            action: action === "all" ? undefined : action,
            limit: 100,
          },
          headers: authHeaders,
        });

        if (mounted) {
          setEvents(result.events);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load activity.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      mounted = false;
    };
  }, [action, authHeaders, entityType]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <InternalAccessBanner area="admin" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
              Platform Audit
            </p>
            <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">Admin Activity</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review workflow activity across timesheets, leave requests, and employee records.
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91]">
            <Activity className="h-6 w-6" />
          </span>
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Entity Type
              <select
                value={entityType}
                onChange={(event) => setEntityType(event.target.value as AuditEntityType | "all")}
                className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              >
                <option value="all">All Entity Types</option>
                {entityTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Action
              <select
                value={action}
                onChange={(event) => setAction(event.target.value as AuditAction | "all")}
                className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              >
                <option value="all">All Actions</option>
                {actionOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatAction(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {isLoading ? (
          <StatusPanel message="Loading platform activity..." />
        ) : errorMessage ? (
          <StatusPanel message={errorMessage} tone="error" />
        ) : (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91]">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Activity Log</h2>
                <p className="text-sm text-slate-600">Newest events first.</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-3 pr-4 font-semibold">Time</th>
                    <th className="py-3 pr-4 font-semibold">Entity</th>
                    <th className="py-3 pr-4 font-semibold">Entity ID</th>
                    <th className="py-3 pr-4 font-semibold">Action</th>
                    <th className="py-3 pr-4 font-semibold">Actor</th>
                    <th className="py-3 font-semibold">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                        No audit events found.
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr key={event.id} className="border-b border-[#E5E7EB]/70 align-top">
                        <td className="py-4 pr-4 text-slate-700">
                          {formatDateTime(event.createdAt)}
                        </td>
                        <td className="py-4 pr-4">
                          <span className="rounded-full border border-[#1DA1F2]/30 bg-[#1DA1F2]/10 px-2.5 py-1 text-xs font-semibold text-[#0B3D91]">
                            {formatEntityType(event.entityType)}
                          </span>
                        </td>
                        <td className="py-4 pr-4 font-mono text-xs text-slate-600">
                          {event.entityId}
                        </td>
                        <td className="py-4 pr-4 font-semibold text-slate-900">
                          {formatAction(event.action)}
                        </td>
                        <td className="py-4 pr-4 font-mono text-xs text-slate-600">
                          {event.actorUserId ?? "-"}
                        </td>
                        <td className="py-4">
                          <pre className="max-w-md whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
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
      className={`rounded-2xl border p-5 text-sm font-medium ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#E5E7EB] bg-white text-[#0B3D91]"
      }`}
    >
      {message}
    </div>
  );
}

function formatEntityType(value: AuditEntityType) {
  const labels: Record<AuditEntityType, string> = {
    timesheet: "Timesheet",
    leave_request: "Leave Request",
    employee: "Employee",
  };

  return labels[value];
}

function formatAction(value: AuditAction) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
