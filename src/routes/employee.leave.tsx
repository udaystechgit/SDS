import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Send, XCircle } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import {
  cancelLeaveRequestFn,
  createLeaveRequestFn,
  listMyLeaveRequestsFn,
  submitLeaveRequestFn,
} from "@/lib/api/leave.functions";
import { useAuth } from "@/lib/auth-context";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types/leave";

export const Route = createFileRoute("/employee/leave")({
  component: EmployeeLeavePage,
});

const leaveTypes: Array<{ value: LeaveType; label: string }> = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "bereavement", label: "Bereavement Leave" },
  { value: "other", label: "Other" },
];

function EmployeeLeavePage() {
  const { session } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

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

    async function loadLeaveRequests() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!authHeaders) {
          throw new Error("Authentication is required.");
        }

        const result = await listMyLeaveRequestsFn({
          headers: authHeaders,
        });

        if (mounted) {
          setLeaveRequests(result.leaveRequests);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load leave requests.",
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
  }, [authHeaders]);

  const annualRequestedDays = leaveRequests
    .filter((request) => request.leaveType === "annual" && request.status !== "cancelled")
    .reduce((total, request) => total + request.totalDays, 0);
  const sickRequestedDays = leaveRequests
    .filter((request) => request.leaveType === "sick" && request.status !== "cancelled")
    .reduce((total, request) => total + request.totalDays, 0);
  const personalRequestedDays = leaveRequests
    .filter((request) => request.leaveType === "personal" && request.status !== "cancelled")
    .reduce((total, request) => total + request.totalDays, 0);

  async function onCreateLeaveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authHeaders) {
      setErrorMessage("Authentication is required.");
      return;
    }

    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await createLeaveRequestFn({
        data: {
          leaveType,
          startDate,
          endDate,
          reason,
        },
        headers: authHeaders,
      });

      setLeaveRequests((current) => sortLeaveRequests([result.leaveRequest, ...current]));
      setSuccessMessage("Draft leave request created.");
      setIsFormOpen(false);
      setLeaveType("annual");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create leave request.");
    } finally {
      setIsCreating(false);
    }
  }

  async function onSubmitLeaveRequest(request: LeaveRequest) {
    if (!authHeaders) {
      setErrorMessage("Authentication is required.");
      return;
    }

    setActionRequestId(request.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await submitLeaveRequestFn({
        data: { id: request.id },
        headers: authHeaders,
      });

      setLeaveRequests((current) =>
        sortLeaveRequests(
          current.map((item) => (item.id === result.leaveRequest.id ? result.leaveRequest : item)),
        ),
      );
      setSuccessMessage("Leave request submitted for review.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit leave request.");
    } finally {
      setActionRequestId(null);
    }
  }

  async function onCancelLeaveRequest(request: LeaveRequest) {
    if (!authHeaders) {
      setErrorMessage("Authentication is required.");
      return;
    }

    setActionRequestId(request.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await cancelLeaveRequestFn({
        data: { id: request.id },
        headers: authHeaders,
      });

      setLeaveRequests((current) =>
        sortLeaveRequests(
          current.map((item) => (item.id === result.leaveRequest.id ? result.leaveRequest : item)),
        ),
      );
      setSuccessMessage("Leave request cancelled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to cancel leave request.");
    } finally {
      setActionRequestId(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">Time Off</p>
          <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">Leave</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create leave requests and track approval status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-16px_rgba(11,61,145,0.8)]"
        >
          <CalendarPlus className="h-4 w-4" />
          Request Leave
        </button>
      </div>

      <section>
        <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Leave Balance</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <BalanceCard
            label="Annual Leave"
            value={`${Math.max(0, 12 - annualRequestedDays)} days`}
          />
          <BalanceCard label="Sick Leave" value={`${Math.max(0, 4 - sickRequestedDays)} days`} />
          <BalanceCard
            label="Personal Leave"
            value={`${Math.max(0, 2 - personalRequestedDays)} days`}
          />
        </div>
      </section>

      {isFormOpen ? (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-heading font-bold text-[#0B3D91]">New Leave Request</h2>
          <form
            className="mt-5 grid gap-4 lg:grid-cols-2"
            onSubmit={(event) => void onCreateLeaveRequest(event)}
          >
            <label className="block text-sm font-semibold text-slate-700">
              Leave Type
              <select
                value={leaveType}
                onChange={(event) => setLeaveType(event.target.value as LeaveType)}
                className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              >
                {leaveTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Start Date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              End Date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700 lg:col-span-2">
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
                placeholder="Optional context for your manager or SDS reviewer."
              />
            </label>
            <div className="flex justify-end gap-2 lg:col-span-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isCreating}
                className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-[#0B3D91] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#092f70] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create Draft"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {successMessage ? <StatusPanel message={successMessage} tone="success" /> : null}
      {errorMessage ? <StatusPanel message={errorMessage} tone="error" /> : null}

      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Recent Requests</h2>
        {isLoading ? (
          <StatusPanel message="Loading leave requests..." />
        ) : leaveRequests.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#BFD7F8] bg-[#F4F8FF] p-8 text-center">
            <p className="text-sm font-semibold text-[#0B3D91]">No leave requests yet.</p>
            <p className="mt-2 text-sm text-slate-600">
              Create a draft request to start the leave approval workflow.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                  <th className="py-3 pr-4 font-semibold">Dates</th>
                  <th className="py-3 pr-4 font-semibold">Type</th>
                  <th className="py-3 pr-4 font-semibold">Days</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Status History</th>
                  <th className="py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request) => (
                  <tr key={request.id} className="border-b border-[#E5E7EB]/70 align-top">
                    <td className="py-4 pr-4 text-slate-900">{getDateRange(request)}</td>
                    <td className="py-4 pr-4 text-slate-700">
                      {getLeaveTypeLabel(request.leaveType)}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-[#0B3D91]">{request.totalDays}</td>
                    <td className="py-4 pr-4">
                      <LeaveStatusBadge status={request.status} />
                    </td>
                    <td className="py-4 pr-4 text-xs leading-5 text-slate-600">
                      <StatusHistory request={request} />
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        {request.status === "draft" ? (
                          <button
                            type="button"
                            onClick={() => void onSubmitLeaveRequest(request)}
                            disabled={actionRequestId === request.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#1DA1F2]/40 px-3.5 py-2 text-sm font-semibold text-[#0B3D91] transition hover:bg-[#1DA1F2]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" />
                            {actionRequestId === request.id ? "Submitting..." : "Submit"}
                          </button>
                        ) : null}
                        {request.status === "draft" || request.status === "submitted" ? (
                          <button
                            type="button"
                            onClick={() => void onCancelLeaveRequest(request)}
                            disabled={actionRequestId === request.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            {actionRequestId === request.id ? "Working..." : "Cancel"}
                          </button>
                        ) : null}
                        {request.status !== "draft" && request.status !== "submitted" ? (
                          <span className="text-sm text-slate-500">No action available</span>
                        ) : null}
                      </div>
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

function BalanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{value}</p>
    </div>
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

function StatusHistory({ request }: { request: LeaveRequest }) {
  return (
    <div className="space-y-1">
      <p>Created: {formatDateTime(request.createdAt)}</p>
      <p>Updated: {formatDateTime(request.updatedAt)}</p>
      {request.approvedAt ? <p>Approved: {formatDateTime(request.approvedAt)}</p> : null}
      {request.rejectedAt ? <p>Rejected: {formatDateTime(request.rejectedAt)}</p> : null}
      {request.rejectionReason ? (
        <p className="text-red-700">Reason: {request.rejectionReason}</p>
      ) : null}
    </div>
  );
}

function sortLeaveRequests(requests: LeaveRequest[]) {
  return [...requests].sort((left, right) => right.startDate.localeCompare(left.startDate));
}

function getLeaveTypeLabel(value: LeaveType) {
  return leaveTypes.find((type) => type.value === value)?.label ?? titleCase(value);
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
