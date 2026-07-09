import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Eye, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { listLeaveRequestsForReviewFn } from "@/lib/api/leave.functions";
import { useAuth } from "@/lib/auth-context";
import type { LeaveRequest, LeaveReviewStatus, LeaveStatus, LeaveType } from "@/lib/types/leave";

export const Route = createFileRoute("/admin/leave")({
  component: AdminLeaveQueuePage,
});

const reviewStatuses: LeaveReviewStatus[] = ["submitted", "approved", "rejected"];

function AdminLeaveQueuePage() {
  const { session } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<LeaveReviewStatus>("submitted");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadLeaveRequests() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!session?.access_token) {
          throw new Error("Authentication is required.");
        }

        const result = await listLeaveRequestsForReviewFn({
          data: {},
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (mounted) {
          setLeaveRequests(result.leaveRequests);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load leave requests for review.",
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaveRequests();

    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  const filteredLeaveRequests = useMemo(
    () => leaveRequests.filter((request) => request.status === filterStatus),
    [filterStatus, leaveRequests],
  );

  const submittedCount = leaveRequests.filter((request) => request.status === "submitted").length;
  const approvedCount = leaveRequests.filter((request) => request.status === "approved").length;
  const rejectedCount = leaveRequests.filter((request) => request.status === "rejected").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <InternalAccessBanner area="admin" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
              Leave Review
            </p>
            <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">
              Admin Leave Queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review submitted employee leave requests and open details for approval decisions.
            </p>
          </div>
          <FilterTabs value={filterStatus} onChange={setFilterStatus} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Submitted" value={submittedCount.toString()} icon={CalendarDays} />
          <SummaryCard label="Approved" value={approvedCount.toString()} icon={CheckCircle2} />
          <SummaryCard label="Rejected" value={rejectedCount.toString()} icon={XCircle} />
        </div>

        {isLoading ? (
          <StatusPanel message="Loading leave requests for review..." />
        ) : errorMessage ? (
          <StatusPanel message={errorMessage} tone="error" />
        ) : (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
            <div>
              <h2 className="text-xl font-heading font-bold text-[#0B3D91]">
                {titleCase(filterStatus)} Leave Requests
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Queue data is loaded from the staff leave review API.
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-3 pr-4 font-semibold">Employee</th>
                    <th className="py-3 pr-4 font-semibold">Date Range</th>
                    <th className="py-3 pr-4 font-semibold">Type</th>
                    <th className="py-3 pr-4 font-semibold">Days</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Updated</th>
                    <th className="py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                        No {filterStatus} leave requests found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaveRequests.map((request) => (
                      <tr key={request.id} className="border-b border-[#E5E7EB]/70">
                        <td className="py-4 pr-4">
                          <p className="font-semibold text-slate-900">
                            {request.employee?.fullName ?? "Employee"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.employee?.employeeId ?? request.employeeId}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-slate-700">{getDateRange(request)}</td>
                        <td className="py-4 pr-4 text-slate-700">
                          {getLeaveTypeLabel(request.leaveType)}
                        </td>
                        <td className="py-4 pr-4 font-semibold text-[#0B3D91]">
                          {request.totalDays}
                        </td>
                        <td className="py-4 pr-4">
                          <LeaveStatusBadge status={request.status} />
                        </td>
                        <td className="py-4 pr-4 text-slate-700">
                          {formatDateTime(request.updatedAt)}
                        </td>
                        <td className="py-4">
                          <Link
                            to="/admin/leave/$id"
                            params={{ id: request.id }}
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

function FilterTabs({
  value,
  onChange,
}: {
  value: LeaveReviewStatus;
  onChange: (value: LeaveReviewStatus) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-white p-1">
      {reviewStatuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            value === status
              ? "bg-[#1DA1F2]/15 text-[#0B3D91]"
              : "text-slate-600 hover:text-[#0B3D91]"
          }`}
        >
          {titleCase(status)}
        </button>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
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

function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const styles: Record<LeaveStatus, string> = {
    draft: "border-slate-200 bg-slate-100 text-slate-700",
    submitted: "border-orange-200 bg-orange-100 text-orange-700",
    approved: "border-green-200 bg-green-100 text-green-700",
    rejected: "border-red-200 bg-red-100 text-red-700",
    cancelled: "border-slate-300 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {titleCase(status)}
    </span>
  );
}

function getLeaveTypeLabel(value: LeaveType) {
  const labels: Record<LeaveType, string> = {
    annual: "Annual Leave",
    sick: "Sick Leave",
    personal: "Personal Leave",
    unpaid: "Unpaid Leave",
    bereavement: "Bereavement Leave",
    other: "Other",
  };

  return labels[value];
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

function getDateRange(request: LeaveRequest) {
  return `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
