import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import {
  approveLeaveRequestFn,
  getLeaveRequestForReviewFn,
  rejectLeaveRequestFn,
} from "@/lib/api/leave.functions";
import { useAuth } from "@/lib/auth-context";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/types/leave";

export const Route = createFileRoute("/admin/leave/$id")({
  component: AdminLeaveDetailPage,
});

function AdminLeaveDetailPage() {
  const { id } = Route.useParams();
  const { session } = useAuth();
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest | null>(null);
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

    async function loadLeaveRequest() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!authHeaders) {
          throw new Error("Authentication is required.");
        }

        const result = await getLeaveRequestForReviewFn({
          data: { id },
          headers: authHeaders,
        });

        if (mounted) {
          setLeaveRequest(result.leaveRequest);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load leave request.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadLeaveRequest();

    return () => {
      mounted = false;
    };
  }, [authHeaders, id]);

  async function onApprove() {
    if (!authHeaders || !leaveRequest) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await approveLeaveRequestFn({
        data: { id: leaveRequest.id },
        headers: authHeaders,
      });
      setLeaveRequest(result.leaveRequest);
      setSuccessMessage("Leave request approved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to approve leave request.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function onReject(rejectionReason: string) {
    if (!authHeaders || !leaveRequest) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await rejectLeaveRequestFn({
        data: {
          id: leaveRequest.id,
          rejectionReason,
        },
        headers: authHeaders,
      });
      setLeaveRequest(result.leaveRequest);
      setSuccessMessage("Leave request rejected.");
      setIsRejectDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reject leave request.");
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
          to="/admin/leave"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1DA1F2] transition-all hover:gap-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Leave Queue
        </Link>

        {successMessage ? <StatusPanel message={successMessage} tone="success" /> : null}
        {errorMessage ? <StatusPanel message={errorMessage} tone="error" /> : null}

        {isLoading ? (
          <StatusPanel message="Loading leave request details..." />
        ) : !leaveRequest ? (
          <StatusPanel message="Leave request not found." tone="error" />
        ) : (
          <>
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)] md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
                    Leave Review
                  </p>
                  <h1 className="mt-1 text-3xl font-heading font-bold text-[#0B3D91]">
                    {leaveRequest.employee?.fullName ?? "Employee Leave Request"}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">{getDateRange(leaveRequest)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <LeaveStatusBadge status={leaveRequest.status} />
                  {leaveRequest.status === "submitted" ? (
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
                  <InfoRow label="Name" value={leaveRequest.employee?.fullName ?? "-"} />
                  <InfoRow
                    label="Employee ID"
                    value={leaveRequest.employee?.employeeId ?? leaveRequest.employeeId}
                  />
                  <InfoRow label="Email" value={leaveRequest.employee?.email ?? "-"} />
                  <InfoRow label="Job Title" value={leaveRequest.employee?.jobTitle ?? "-"} />
                  <InfoRow label="Department" value={leaveRequest.employee?.department ?? "-"} />
                  <InfoRow label="Client" value={leaveRequest.employee?.assignedClient ?? "-"} />
                  <InfoRow label="Project" value={leaveRequest.employee?.assignedProject ?? "-"} />
                </Card>

                <Card title="Workflow Metadata">
                  <InfoRow label="Status" value={leaveRequest.status} />
                  <InfoRow label="Created At" value={formatDateTime(leaveRequest.createdAt)} />
                  <InfoRow label="Updated At" value={formatDateTime(leaveRequest.updatedAt)} />
                  <InfoRow label="Approved At" value={formatDateTime(leaveRequest.approvedAt)} />
                  <InfoRow label="Rejected At" value={formatDateTime(leaveRequest.rejectedAt)} />
                  {leaveRequest.rejectionReason ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Rejection Reason
                      </p>
                      <p className="mt-2 text-sm text-red-900">{leaveRequest.rejectionReason}</p>
                    </div>
                  ) : null}
                </Card>
              </section>

              <section className="space-y-6">
                <Card title="Request Details">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoBlock
                      label="Leave Type"
                      value={getLeaveTypeLabel(leaveRequest.leaveType)}
                    />
                    <InfoBlock label="Total Days" value={leaveRequest.totalDays.toString()} />
                    <InfoBlock label="Start Date" value={formatDate(leaveRequest.startDate)} />
                    <InfoBlock label="End Date" value={formatDate(leaveRequest.endDate)} />
                  </div>
                  <div className="rounded-xl border border-[#E5E7EB] bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reason
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">
                      {leaveRequest.reason || "No reason provided."}
                    </p>
                  </div>
                </Card>
              </section>
            </div>
          </>
        )}
      </section>

      <RejectLeaveRequestDialog
        isOpen={isRejectDialogOpen}
        isSubmitting={isActionLoading}
        leaveRequest={leaveRequest}
        onClose={() => setIsRejectDialogOpen(false)}
        onReject={onReject}
      />
    </main>
  );
}

function RejectLeaveRequestDialog({
  isOpen,
  isSubmitting,
  leaveRequest,
  onClose,
  onReject,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  leaveRequest: LeaveRequest | null;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setErrorMessage("");
    }
  }, [isOpen]);

  if (!isOpen || !leaveRequest) {
    return null;
  }

  async function submitReject() {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setErrorMessage("Rejection reason is required.");
      return;
    }

    setErrorMessage("");
    await onReject(trimmedReason);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D91]/35 p-4">
      <section className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_40px_60px_-30px_rgba(11,61,145,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Reject Leave Request</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add a clear reason for {leaveRequest.employee?.fullName ?? "this employee"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#0B3D91]"
            aria-label="Close rejection dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label
          className="mt-5 block text-sm font-semibold text-slate-700"
          htmlFor="leave-rejection-reason"
        >
          Rejection Reason
        </label>
        <textarea
          id="leave-rejection-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={5}
          className="mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
          placeholder="Explain what needs to be corrected before approval."
        />

        {errorMessage ? (
          <p className="mt-2 text-sm font-medium text-red-700">{errorMessage}</p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitReject()}
            disabled={isSubmitting}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Rejecting..." : "Reject Leave Request"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <h2 className="text-lg font-heading font-bold text-[#0B3D91]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB]/70 pb-3 last:border-0 last:pb-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="max-w-[60%] text-right text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
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
    <div className={`rounded-2xl border p-5 text-sm font-medium ${styles[tone]}`}>{message}</div>
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
