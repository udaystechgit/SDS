import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import {
  readTimesheets,
  saveTimesheets,
  approveTimesheetByRole,
  rejectTimesheetByRole,
  type TimesheetRecord,
} from "@/lib/timesheets";

export const Route = createFileRoute("/employer/timesheets")({
  component: EmployerTimesheetsPage,
});

function EmployerTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>(() => readTimesheets());
  const [message, setMessage] = useState("");

  const rows = useMemo(
    () => timesheets.sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1)),
    [timesheets],
  );

  function commit(next: TimesheetRecord[]) {
    setTimesheets(next);
    saveTimesheets(next);
  }

  function onEmployerApprove(record: TimesheetRecord) {
    const next = timesheets.map((row) =>
      row.id === record.id ? approveTimesheetByRole(row, "employer", "Employer") : row,
    );
    commit(next);
    setMessage(`Employer approved timesheet for ${record.employeeName}.`);
  }

  function onEmployerReject(record: TimesheetRecord) {
    const reason = window.prompt("Add rejection reason:", "Please update the timesheet details.");
    const next = timesheets.map((row) =>
      row.id === record.id ? rejectTimesheetByRole(row, "employer", "Employer", reason ?? undefined) : row,
    );
    commit(next);
    setMessage(`Employer rejected timesheet for ${record.employeeName}.`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="employer" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Employer access protection will be added in backend phase." />

        {message ? <div className="rounded-xl border border-[#1DA1F2]/30 bg-[#1DA1F2]/10 p-3 text-sm text-[#0B3D91]">{message}</div> : null}

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Employer Timesheets</h1>
          <p className="mt-1 text-slate-600">View and review timesheets related to assigned resources.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                <th className="py-3">UID</th>
                <th className="py-3">Employee</th>
                <th className="py-3">Client</th>
                <th className="py-3">Project</th>
                <th className="py-3">Week</th>
                <th className="py-3">Hours</th>
                <th className="py-3">Status</th>
                <th className="py-3">Employer Approval</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-slate-500">No timesheets found.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#E5E7EB]/70">
                    <td className="py-3 font-mono text-xs font-semibold text-[#1DA1F2]">{row.employeeUID}</td>
                    <td className="py-3 font-medium text-slate-900">{row.employeeName}</td>
                    <td className="py-3">{row.client || "-"}</td>
                    <td className="py-3">{row.project || "-"}</td>
                    <td className="py-3">{row.weekStartDate} to {row.weekEndDate}</td>
                    <td className="py-3">{row.totalHours}</td>
                    <td className="py-3"><span className="rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-xs text-[#0B3D91]">{row.status}</span></td>
                    <td className="py-3"><span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">{row.employerApprovalStatus}</span></td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-[#0B3D91]">View</button>
                        <button type="button" disabled={row.status !== "Submitted" || row.employerApprovalStatus !== "Pending"} onClick={() => onEmployerApprove(row)} className="rounded-lg border border-green-300 px-2 py-1 text-xs font-semibold text-green-700 disabled:opacity-50">Approve</button>
                        <button type="button" disabled={row.status !== "Submitted" || row.employerApprovalStatus !== "Pending"} onClick={() => onEmployerReject(row)} className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
