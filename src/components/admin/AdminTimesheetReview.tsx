import { X } from "lucide-react";
import { useEffect, useState } from "react";

import type { Timesheet, TimesheetStatus } from "@/lib/types/timesheet";

export type ReviewFilterStatus = "submitted" | "approved" | "rejected";

export function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
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

export function StatusPanel({
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

export function FilterTabs({
  value,
  onChange,
}: {
  value: ReviewFilterStatus;
  onChange: (value: ReviewFilterStatus) => void;
}) {
  const tabs: ReviewFilterStatus[] = ["submitted", "approved", "rejected"];

  return (
    <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            value === tab ? "bg-[#1DA1F2]/15 text-[#0B3D91]" : "text-slate-600 hover:text-[#0B3D91]"
          }`}
        >
          {titleCase(tab)}
        </button>
      ))}
    </div>
  );
}

export function RejectTimesheetDialog({
  isOpen,
  isSubmitting,
  timesheet,
  onClose,
  onReject,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  timesheet: Timesheet | null;
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

  if (!isOpen || !timesheet) {
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
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Reject Timesheet</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add a clear reason for {timesheet.employee?.fullName ?? "this employee"}.
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
          htmlFor="rejection-reason"
        >
          Rejection Reason
        </label>
        <textarea
          id="rejection-reason"
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
            {isSubmitting ? "Rejecting..." : "Reject Timesheet"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null) {
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

export function getWeekRange(timesheet: Timesheet) {
  return `${formatDate(timesheet.weekStart)} - ${formatDate(timesheet.weekEnd)}`;
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
