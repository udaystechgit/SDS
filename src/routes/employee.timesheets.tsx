import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Plus, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createTimesheetFn,
  listMyTimesheetsFn,
  submitTimesheetFn,
} from "@/lib/api/timesheet.functions";
import { useAuth } from "@/lib/auth-context";
import type { Timesheet, TimesheetStatus } from "@/lib/types/timesheet";

export const Route = createFileRoute("/employee/timesheets")({
  component: EmployeeTimesheetsPage,
});

function EmployeeTimesheetsPage() {
  const { session } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

    async function loadTimesheets() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!authHeaders) {
          throw new Error("Authentication is required.");
        }

        const result = await listMyTimesheetsFn({
          headers: authHeaders,
        });

        if (mounted) {
          setTimesheets(result.timesheets);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load timesheets.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTimesheets();

    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const draftCount = timesheets.filter((timesheet) => timesheet.status === "draft").length;
  const submittedCount = timesheets.filter((timesheet) => timesheet.status === "submitted").length;
  const approvedCount = timesheets.filter((timesheet) => timesheet.status === "approved").length;
  const currentWeekHours =
    timesheets.find((timesheet) => isCurrentWeek(timesheet))?.totalHours ?? 0;

  async function onCreateDraft() {
    if (!authHeaders) {
      setErrorMessage("Authentication is required.");
      return;
    }

    const week = getCurrentWeekRange();

    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await createTimesheetFn({
        data: {
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
        },
        headers: authHeaders,
      });

      setTimesheets((current) => sortTimesheets([result.timesheet, ...current]));
      setSuccessMessage("Draft timesheet created.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create draft timesheet.");
    } finally {
      setIsCreating(false);
    }
  }

  async function onSubmitDraft(timesheet: Timesheet) {
    if (!authHeaders) {
      setErrorMessage("Authentication is required.");
      return;
    }

    setSubmittingId(timesheet.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await submitTimesheetFn({
        data: {
          id: timesheet.id,
        },
        headers: authHeaders,
      });

      setTimesheets((current) =>
        sortTimesheets(
          current.map((item) => (item.id === result.timesheet.id ? result.timesheet : item)),
        ),
      );
      setSuccessMessage("Timesheet submitted for approval.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit timesheet.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
            Employee Time
          </p>
          <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">Timesheets</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track weekly hours and monitor approval status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onCreateDraft()}
          disabled={isCreating || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-16px_rgba(11,61,145,0.8)] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating..." : "Create Draft"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Current Week Summary" value={`${currentWeekHours} hrs`} />
        <SummaryCard label="Draft Timesheets" value={draftCount.toString()} />
        <SummaryCard label="Submitted Timesheets" value={submittedCount.toString()} />
        <SummaryCard label="Approved Timesheets" value={approvedCount.toString()} />
      </div>

      {successMessage ? <StatusPanel message={successMessage} tone="success" /> : null}
      {errorMessage ? <StatusPanel message={errorMessage} tone="error" /> : null}

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91]">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">My Timesheets</h2>
            <p className="text-sm text-slate-600">Weekly entries loaded from your SDS account.</p>
          </div>
        </div>

        {isLoading ? (
          <StatusPanel message="Loading timesheets..." />
        ) : timesheets.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#BFD7F8] bg-[#F4F8FF] p-8 text-center">
            <p className="text-sm font-semibold text-[#0B3D91]">No timesheets yet.</p>
            <p className="mt-2 text-sm text-slate-600">
              Create a draft timesheet to begin tracking your weekly hours.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                  <th className="py-3 pr-4 font-semibold">Week Range</th>
                  <th className="py-3 pr-4 font-semibold">Total Hours</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Submitted Date</th>
                  <th className="py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((timesheet) => (
                  <tr key={timesheet.id} className="border-b border-[#E5E7EB]/70">
                    <td className="py-4 pr-4 text-slate-900">{getWeekRange(timesheet)}</td>
                    <td className="py-4 pr-4 font-semibold text-[#0B3D91]">
                      {timesheet.totalHours}
                    </td>
                    <td className="py-4 pr-4">
                      <TimesheetStatusBadge status={timesheet.status} />
                    </td>
                    <td className="py-4 pr-4 text-slate-700">
                      {formatDateTime(timesheet.submittedAt)}
                    </td>
                    <td className="py-4">
                      {timesheet.status === "draft" ? (
                        <button
                          type="button"
                          onClick={() => void onSubmitDraft(timesheet)}
                          disabled={submittingId === timesheet.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#1DA1F2]/40 px-3.5 py-2 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Send className="h-4 w-4" />
                          {submittingId === timesheet.id ? "Submitting..." : "Submit"}
                        </button>
                      ) : (
                        <span className="text-sm text-slate-500">No action available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{value}</p>
    </section>
  );
}

function StatusPanel({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error" | "success";
}) {
  const styles = {
    default: "border-[#E5E7EB] bg-white text-[#0B3D91]",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-[#1DA1F2]/40 bg-[#1DA1F2]/10 text-[#0B3D91]",
  };

  return (
    <div className={`mt-5 rounded-2xl border p-5 text-sm font-medium ${styles[tone]}`}>
      {message}
    </div>
  );
}

function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  const styles: Record<TimesheetStatus, string> = {
    draft: "border-slate-200 bg-slate-100 text-slate-700",
    submitted: "border-orange-200 bg-orange-100 text-orange-700",
    approved: "border-green-200 bg-green-100 text-green-700",
    rejected: "border-red-200 bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {titleCase(status)}
    </span>
  );
}

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    weekStart: toDateInputValue(start),
    weekEnd: toDateInputValue(end),
  };
}

function isCurrentWeek(timesheet: Timesheet) {
  const currentWeek = getCurrentWeekRange();
  return timesheet.weekStart === currentWeek.weekStart && timesheet.weekEnd === currentWeek.weekEnd;
}

function sortTimesheets(timesheets: Timesheet[]) {
  return [...timesheets].sort((left, right) => right.weekStart.localeCompare(left.weekStart));
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function getWeekRange(timesheet: Timesheet) {
  return `${formatDate(timesheet.weekStart)} - ${formatDate(timesheet.weekEnd)}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
