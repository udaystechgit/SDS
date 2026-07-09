import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";
import {
  RejectTimesheetDialog,
  StatusPanel,
  TimesheetStatusBadge,
  formatDate,
  formatDateTime,
  getWeekRange,
} from "@/components/admin/AdminTimesheetReview";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { useAuth } from "@/lib/auth-context";
import {
  approveTimesheetFn,
  getTimesheetForApprovalFn,
  rejectTimesheetFn,
} from "@/lib/api/timesheet.functions";
import type { Timesheet } from "@/lib/types/timesheet";

export const Route = createFileRoute("/admin/timesheets/$id")({
  component: AdminTimesheetDetailPage,
});

function AdminTimesheetDetailPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

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

    async function loadTimesheet() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!authHeaders) {
          throw new Error("Authentication is required.");
        }

        const result = await getTimesheetForApprovalFn({
          data: { id },
          headers: authHeaders,
        });

        if (mounted) {
          setTimesheet(result.timesheet);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load timesheet.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTimesheet();

    return () => {
      mounted = false;
    };
  }, [authHeaders, id]);

  const dailyHours = useMemo(() => {
    if (!timesheet) {
      return [];
    }

    const values: Array<{ date: string; hours: number }> = [];
    const start = new Date(`${timesheet.weekStart}T00:00:00Z`);
    const end = new Date(`${timesheet.weekEnd}T00:00:00Z`);

    for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10);
      const hours = timesheet.entries
        .filter((entry) => entry.workDate === date)
        .reduce((total, entry) => total + entry.hours, 0);

      values.push({ date, hours });
    }

    return values;
  }, [timesheet]);

  async function onApprove() {
    if (!authHeaders || !timesheet) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await approveTimesheetFn({
        data: { id: timesheet.id },
        headers: authHeaders,
      });
      setTimesheet(result.timesheet);
      setSuccessMessage("Timesheet approved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to approve timesheet.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function onReject(rejectionReason: string) {
    if (!authHeaders || !timesheet) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await rejectTimesheetFn({
        data: {
          id: timesheet.id,
          rejectionReason,
        },
        headers: authHeaders,
      });
      setTimesheet(result.timesheet);
      setSuccessMessage("Timesheet rejected.");
      setIsRejectDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reject timesheet.");
    } finally {
      setIsActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <InternalAccessBanner area="admin" />

        <Link
          to="/admin/timesheets"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1DA1F2] transition-all hover:gap-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Timesheets
        </Link>

        {successMessage ? <StatusPanel message={successMessage} tone="success" /> : null}
        {errorMessage ? <StatusPanel message={errorMessage} tone="error" /> : null}

        {isLoading ? (
          <StatusPanel message="Loading timesheet details..." />
        ) : !timesheet ? (
          <StatusPanel message="Timesheet not found." tone="error" />
        ) : (
          <>
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)] md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
                    Timesheet Review
                  </p>
                  <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">
                    {timesheet.employee?.fullName ?? "Employee Timesheet"}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">{getWeekRange(timesheet)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TimesheetStatusBadge status={timesheet.status} />
                  {timesheet.status === "submitted" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void onApprove()}
                        disabled={isActionLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isActionLoading ? "Working..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRejectDialogOpen(true)}
                        disabled={isActionLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
              <section className="space-y-6">
                <Card title="Employee Information">
                  <InfoRow label="Name" value={timesheet.employee?.fullName ?? "-"} />
                  <InfoRow
                    label="Employee ID"
                    value={timesheet.employee?.employeeId ?? timesheet.employeeId}
                  />
                  <InfoRow label="Email" value={timesheet.employee?.email ?? "-"} />
                  <InfoRow label="Job Title" value={timesheet.employee?.jobTitle ?? "-"} />
                  <InfoRow label="Department" value={timesheet.employee?.department ?? "-"} />
                  <InfoRow label="Client" value={timesheet.employee?.assignedClient ?? "-"} />
                  <InfoRow label="Project" value={timesheet.employee?.assignedProject ?? "-"} />
                </Card>

                <Card title="Submission Metadata">
                  <InfoRow label="Status" value={timesheet.status} />
                  <InfoRow label="Submitted At" value={formatDateTime(timesheet.submittedAt)} />
                  <InfoRow label="Approved At" value={formatDateTime(timesheet.approvedAt)} />
                  <InfoRow label="Rejected At" value={formatDateTime(timesheet.rejectedAt)} />
                  {timesheet.rejectionReason ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Rejection Reason
                      </p>
                      <p className="mt-2 text-sm text-red-900">{timesheet.rejectionReason}</p>
                    </div>
                  ) : null}
                </Card>
              </section>

              <section className="space-y-6">
                <Card title="Daily Hours">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {dailyHours.map((day) => (
                      <div
                        key={day.date}
                        className="rounded-xl border border-[#E5E7EB] bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {formatDate(day.date)}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-[#0B3D91]">{day.hours}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#1DA1F2]/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0B3D91]">
                      Total Hours
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{timesheet.totalHours}</p>
                  </div>
                </Card>

                <Card title="Timesheet Entries">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                          <th className="py-3 pr-4 font-semibold">Date</th>
                          <th className="py-3 pr-4 font-semibold">Project</th>
                          <th className="py-3 pr-4 font-semibold">Description</th>
                          <th className="py-3 font-semibold">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesheet.entries.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-500">
                              No entries were added to this timesheet.
                            </td>
                          </tr>
                        ) : (
                          timesheet.entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-[#E5E7EB]/70">
                              <td className="py-3 pr-4 text-slate-700">
                                {formatDate(entry.workDate)}
                              </td>
                              <td className="py-3 pr-4 font-medium text-slate-900">
                                {entry.projectName || "-"}
                              </td>
                              <td className="py-3 pr-4 text-slate-700">
                                {entry.taskDescription || "-"}
                              </td>
                              <td className="py-3 font-semibold text-[#0B3D91]">{entry.hours}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            </div>
          </>
        )}
      </section>

      <RejectTimesheetDialog
        isOpen={isRejectDialogOpen}
        isSubmitting={isActionLoading}
        timesheet={timesheet}
        onClose={() => setIsRejectDialogOpen(false)}
        onReject={onReject}
      />
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-heading font-bold text-[#0B3D91]">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
