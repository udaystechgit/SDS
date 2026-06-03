import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import {
  type ApprovalStageStatus,
  type TimesheetRecord,
  type TimesheetStatus,
  readTimesheets,
  saveTimesheets,
  approveTimesheetByRole,
  rejectTimesheetByRole,
} from "@/lib/timesheets";
import { readEmployees } from "@/lib/employees";

export const Route = createFileRoute("/admin/timesheets")({
  component: AdminTimesheetsPage,
});

type FilterStatus = "All" | TimesheetStatus;

function AdminTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>(() => readTimesheets());
  const employees = readEmployees();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("All");
  const [weekStartFilter, setWeekStartFilter] = useState("");
  const [pendingDeleteTimesheet, setPendingDeleteTimesheet] = useState<TimesheetRecord | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetRecord | null>(null);
  const [message, setMessage] = useState("");

  const filteredTimesheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timesheets.filter((ts) => {
      const matchesSearch =
        q.length === 0 ||
        ts.employeeName.toLowerCase().includes(q) ||
        ts.employeeUID.toLowerCase().includes(q) ||
        ts.client.toLowerCase().includes(q) ||
        ts.project.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || ts.status === statusFilter;
      const matchesWeek =
        !weekStartFilter ||
        ts.weekStartDate === weekStartFilter;

      return matchesSearch && matchesStatus && matchesWeek;
    });
  }, [timesheets, searchQuery, statusFilter, weekStartFilter]);

  function commitTimesheets(next: TimesheetRecord[]) {
    setTimesheets(next);
    saveTimesheets(next);
  }

  function onApprove(ts: TimesheetRecord) {
    const updated = approveTimesheetByRole(ts, "admin", "Admin");
    const next = timesheets.map((item) => (item.id === ts.id ? updated : item));
    commitTimesheets(next);
    if (selectedTimesheet?.id === ts.id) setSelectedTimesheet(updated);
    setMessage(`Timesheet for ${ts.employeeName} approved.`);
  }

  function onReject(ts: TimesheetRecord) {
    const reason = window.prompt("Add rejection reason:", "Timesheet details need clarification.");
    const updated = rejectTimesheetByRole(ts, "admin", "Admin", reason ?? undefined);
    const next = timesheets.map((item) => (item.id === ts.id ? updated : item));
    commitTimesheets(next);
    if (selectedTimesheet?.id === ts.id) setSelectedTimesheet(updated);
    setMessage(`Timesheet for ${ts.employeeName} rejected.`);
  }

  function onDelete(tsId: string) {
    const next = timesheets.filter((ts) => ts.id !== tsId);
    commitTimesheets(next);
    if (selectedTimesheet?.id === tsId) setSelectedTimesheet(null);
    setPendingDeleteTimesheet(null);
    setMessage("Timesheet deleted successfully.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <InternalAccessBanner area="admin" />

        {message ? (
          <div className="rounded-2xl border border-[#1DA1F2]/40 bg-[#1DA1F2]/10 px-4 py-3 text-sm font-medium text-[#0B3D91]">
            {message}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Timesheet Management</h1>
          <p className="mt-1 text-slate-600">Review and approve employee timesheets.</p>
        </div>

        <div className="grid xl:grid-cols-[1.1fr_1fr] gap-6">
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)] max-h-[800px] overflow-y-auto">
            <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Timesheets</h2>
            <p className="mt-1 text-sm text-slate-600">All submitted timesheets for review.</p>

            <div className="mt-5 grid gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
                placeholder="Search by employee, UID, client, project"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              >
                <option>All Statuses</option>
                <option>Draft</option>
                <option>Submitted</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
              <input
                type="date"
                value={weekStartFilter}
                onChange={(e) => setWeekStartFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#1DA1F2]/25"
              />
            </div>

            <div className="mt-5 space-y-2">
              {filteredTimesheets.length === 0 ? (
                <p className="py-8 text-center text-slate-500 text-sm">No timesheets match the selected criteria.</p>
              ) : (
                filteredTimesheets.map((ts) => (
                  <button
                    key={ts.id}
                    onClick={() => setSelectedTimesheet(ts)}
                    className={`w-full rounded-lg border-2 p-3 text-left transition ${
                      selectedTimesheet?.id === ts.id
                        ? "border-[#1DA1F2] bg-[#1DA1F2]/5"
                        : "border-[#E5E7EB] hover:border-[#E5E7EB]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{ts.employeeName}</p>
                        <p className="text-xs text-slate-500">
                          {ts.weekStartDate} to {ts.weekEndDate}
                        </p>
                      </div>
                      <TimesheetStatusBadge status={ts.status} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedTimesheet ? (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)]">
              <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Timesheet Details</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-600">Employee / UID</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {selectedTimesheet.employeeName}{" "}
                    <span className="text-xs text-slate-500">({selectedTimesheet.employeeUID})</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-600">Client</p>
                    <p className="mt-1 font-medium text-slate-900">{selectedTimesheet.client}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Project</p>
                    <p className="mt-1 font-medium text-slate-900">{selectedTimesheet.project}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-600">Week Start</p>
                    <p className="mt-1 font-medium text-slate-900">{selectedTimesheet.weekStartDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Week End</p>
                    <p className="mt-1 font-medium text-slate-900">{selectedTimesheet.weekEndDate}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-600">Daily Hours</p>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const).map((day, idx) => (
                      <div key={day} className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-2 text-center">
                        <p className="text-xs text-slate-600">{day.slice(0, 3)}</p>
                        <p className="mt-1 text-sm font-bold text-[#0B3D91]">
                          {(
                            [
                              selectedTimesheet.monday,
                              selectedTimesheet.tuesday,
                              selectedTimesheet.wednesday,
                              selectedTimesheet.thursday,
                              selectedTimesheet.friday,
                              selectedTimesheet.saturday,
                              selectedTimesheet.sunday,
                            ] as const
                          )[idx]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">Total Hours</p>
                  <p className="mt-1 text-2xl font-bold text-[#0B3D91]">{selectedTimesheet.totalHours}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-600">Work Summary</p>
                  <p className="mt-1 text-slate-900 whitespace-pre-wrap text-sm">{selectedTimesheet.workSummary}</p>
                </div>

                {selectedTimesheet.blockers ? (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-xs text-orange-600 font-semibold">Blockers / Notes</p>
                    <p className="mt-1 text-sm text-orange-900 whitespace-pre-wrap">{selectedTimesheet.blockers}</p>
                  </div>
                ) : null}

                <div>
                  <p className="text-xs text-slate-600">Status</p>
                  <div className="mt-2">
                    <TimesheetStatusBadge status={selectedTimesheet.status} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-600">Approval Flow</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StageStatusBadge label="Employer" status={selectedTimesheet.employerApprovalStatus} />
                    <StageStatusBadge label="Client" status={selectedTimesheet.clientApprovalStatus} />
                    <StageStatusBadge label="Admin" status={selectedTimesheet.adminApprovalStatus} />
                  </div>
                </div>

                {selectedTimesheet.submittedDate ? (
                  <div>
                    <p className="text-xs text-slate-600">Submitted Date</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(selectedTimesheet.submittedDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}

                {selectedTimesheet.approvedDate ? (
                  <div>
                    <p className="text-xs text-slate-600">Approved Date</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(selectedTimesheet.approvedDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {selectedTimesheet.status === "Submitted" && selectedTimesheet.adminApprovalStatus === "Pending" ? (
                  <>
                    <button
                      onClick={() => onApprove(selectedTimesheet)}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(selectedTimesheet)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                ) : null}
                <button
                  onClick={() => setPendingDeleteTimesheet(selectedTimesheet)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 md:p-8 shadow-[0_24px_40px_-34px_rgba(11,61,145,0.6)] flex items-center justify-center">
              <p className="text-slate-500">Select a timesheet to view details.</p>
            </div>
          )}
        </div>
      </section>

      {pendingDeleteTimesheet ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B3D91]/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_40px_60px_-30px_rgba(11,61,145,0.8)]">
            <h3 className="text-lg font-heading font-bold text-[#0B3D91]">Delete Timesheet</h3>
            <p className="mt-3 text-sm text-slate-700">
              Are you sure you want to delete the timesheet for {pendingDeleteTimesheet.employeeName} ({pendingDeleteTimesheet.weekStartDate} to {pendingDeleteTimesheet.weekEndDate})? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDeleteTimesheet(null)}
                className="rounded-lg border border-[#E5E7EB] px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(pendingDeleteTimesheet.id)}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Timesheet
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  const styles: Record<TimesheetStatus, string> = {
    Draft: "bg-slate-100 text-slate-700 border-slate-200",
    Submitted: "bg-orange-100 text-orange-700 border-orange-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}

function StageStatusBadge({
  label,
  status,
}: {
  label: string;
  status: ApprovalStageStatus;
}) {
  const styles: Record<ApprovalStageStatus, string> = {
    Pending: "bg-orange-100 text-orange-700 border-orange-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${styles[status]}`}>
      {label}: {status}
    </span>
  );
}
