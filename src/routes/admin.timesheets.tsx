import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Eye, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";
import {
  FilterTabs,
  StatusPanel,
  TimesheetStatusBadge,
  formatDateTime,
  getWeekRange,
  type ReviewFilterStatus,
} from "@/components/admin/AdminTimesheetReview";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { useAuth } from "@/lib/auth-context";
import { listTimesheetsForReviewFn } from "@/lib/api/timesheet.functions";
import type { Timesheet } from "@/lib/types/timesheet";

export const Route = createFileRoute("/admin/timesheets")({
  component: AdminTimesheetQueuePage,
});

function AdminTimesheetQueuePage() {
  const { session } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [filterStatus, setFilterStatus] = useState<ReviewFilterStatus>("submitted");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTimesheets() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!session?.access_token) {
          throw new Error("Authentication is required.");
        }

        const result = await listTimesheetsForReviewFn({
          data: {},
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (mounted) {
          setTimesheets(result.timesheets);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load timesheets for review.",
          );
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
  }, [session?.access_token]);

  const filteredTimesheets = useMemo(
    () => timesheets.filter((timesheet) => timesheet.status === filterStatus),
    [filterStatus, timesheets],
  );

  const submittedCount = timesheets.filter((timesheet) => timesheet.status === "submitted").length;
  const approvedCount = timesheets.filter((timesheet) => timesheet.status === "approved").length;
  const rejectedCount = timesheets.filter((timesheet) => timesheet.status === "rejected").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <InternalAccessBanner area="admin" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
              Timesheet Review
            </p>
            <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">
              Admin Timesheet Queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review submitted employee timesheets and open details for approval decisions.
            </p>
          </div>
          <FilterTabs value={filterStatus} onChange={setFilterStatus} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Submitted" value={submittedCount.toString()} icon={Clock3} />
          <SummaryCard label="Approved" value={approvedCount.toString()} icon={CheckCircle2} />
          <SummaryCard label="Rejected" value={rejectedCount.toString()} icon={XCircle} />
        </div>

        {isLoading ? (
          <StatusPanel message="Loading timesheets for review..." />
        ) : errorMessage ? (
          <StatusPanel message={errorMessage} tone="error" />
        ) : (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-bold text-[#0B3D91]">
                  {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Timesheets
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Queue data is loaded from the staff approval API.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[840px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-3 pr-4 font-semibold">Employee</th>
                    <th className="py-3 pr-4 font-semibold">Week Range</th>
                    <th className="py-3 pr-4 font-semibold">Total Hours</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Submitted Date</th>
                    <th className="py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                        No {filterStatus} timesheets found.
                      </td>
                    </tr>
                  ) : (
                    filteredTimesheets.map((timesheet) => (
                      <tr key={timesheet.id} className="border-b border-[#E5E7EB]/70">
                        <td className="py-4 pr-4">
                          <p className="font-semibold text-slate-900">
                            {timesheet.employee?.fullName ?? "Employee"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {timesheet.employee?.employeeId ?? timesheet.employeeId}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-slate-700">{getWeekRange(timesheet)}</td>
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
                          <Link
                            to="/admin/timesheets/$id"
                            params={{ id: timesheet.id }}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10"
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Link>
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

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock3;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91]">
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </section>
  );
}
