import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import {
  readTimesheets,
  saveTimesheets,
  approveTimesheetByRole,
  rejectTimesheetByRole,
  type TimesheetRecord,
} from "@/lib/timesheets";

export const Route = createFileRoute("/client/timesheets")({
  component: ClientTimesheetsPage,
});

function ClientTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>(() => readTimesheets());
  const [message, setMessage] = useState("");

  function commit(next: TimesheetRecord[]) {
    setTimesheets(next);
    saveTimesheets(next);
  }

  function onApprove(record: TimesheetRecord) {
    const next = timesheets.map((row) =>
      row.id === record.id ? approveTimesheetByRole(row, "client", "Client") : row,
    );
    commit(next);
    setMessage(`Client approved timesheet for ${record.employeeName}.`);
  }

  function onReject(record: TimesheetRecord) {
    const reason = window.prompt("Add rejection reason:", "Need more details in work summary.");
    const next = timesheets.map((row) =>
      row.id === record.id ? rejectTimesheetByRole(row, "client", "Client", reason ?? undefined) : row,
    );
    commit(next);
    setMessage(`Client rejected timesheet for ${record.employeeName}.`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="client" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Client login and secure billing access will be added in backend phase." />

        {message ? (
          <div className="rounded-xl border border-[#1DA1F2]/30 bg-[#1DA1F2]/10 p-3 text-sm text-[#0B3D91]">
            {message}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Client Timesheets</h1>
          <p className="mt-1 text-slate-600">Review and approve submitted timesheets for assigned resources.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <table className="w-full min-w-[1020px] text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                <th className="py-3">Employee UID</th>
                <th className="py-3">Employee</th>
                <th className="py-3">Project</th>
                <th className="py-3">Week</th>
                <th className="py-3">Hours</th>
                <th className="py-3">Status</th>
                <th className="py-3">Client Approval</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No timesheets available.</td>
                </tr>
              ) : (
                timesheets.map((row) => (
                  <tr key={row.id} className="border-b border-[#E5E7EB]/70">
                    <td className="py-3 font-mono text-xs font-semibold text-[#1DA1F2]">{row.employeeUID}</td>
                    <td className="py-3 font-medium text-slate-900">{row.employeeName}</td>
                    <td className="py-3">{row.project || "-"}</td>
                    <td className="py-3">{row.weekStartDate} to {row.weekEndDate}</td>
                    <td className="py-3">{row.totalHours}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-[#1DA1F2]/10 px-2 py-1 text-xs text-[#0B3D91]">{row.status}</span>
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">{row.clientApprovalStatus}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs font-semibold text-[#0B3D91]">View Timesheet</button>
                        <button type="button" disabled={row.status !== "Submitted" || row.clientApprovalStatus !== "Pending"} onClick={() => onApprove(row)} className="rounded-lg border border-green-300 px-2 py-1 text-xs font-semibold text-green-700 disabled:opacity-50">Approve</button>
                        <button type="button" disabled={row.status !== "Submitted" || row.clientApprovalStatus !== "Pending"} onClick={() => onReject(row)} className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">Reject</button>
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
