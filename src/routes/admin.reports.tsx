import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { readEmployees, getActiveEmployees } from "@/lib/employees";
import { readTimesheets } from "@/lib/timesheets";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const employees = readEmployees();
  const activeEmployees = getActiveEmployees();
  const timesheets = readTimesheets();

  const stats = useMemo(() => {
    const submitted = timesheets.filter((ts) => ts.status === "Submitted");
    const pendingAdmin = submitted.filter((ts) => ts.adminApprovalStatus === "Pending");
    const approved = timesheets.filter((ts) => ts.status === "Approved");
    const rejected = timesheets.filter((ts) => ts.status === "Rejected");
    const approvedHours = approved.reduce((sum, ts) => sum + ts.totalHours, 0);

    return [
      { label: "Total Employees", value: employees.length, icon: Users, color: "bg-[#0B3D91]" },
      { label: "Active Employees", value: activeEmployees.length, icon: Users, color: "bg-emerald-600" },
      { label: "Total Submitted Timesheets", value: submitted.length, icon: Clock, color: "bg-orange-500" },
      { label: "Pending Admin Approval", value: pendingAdmin.length, icon: Clock, color: "bg-orange-600" },
      { label: "Approved Hours", value: approvedHours, icon: CheckCircle2, color: "bg-green-600" },
      { label: "Rejected Timesheets", value: rejected.length, icon: XCircle, color: "bg-red-600" },
    ];
  }, [employees, activeEmployees, timesheets]);

  const hoursByEmployee = useMemo(() => {
    const map = new Map<string, { uid: string; name: string; hours: number; approved: number }>();
    timesheets.forEach((ts) => {
      const existing = map.get(ts.employeeUID) || {
        uid: ts.employeeUID,
        name: ts.employeeName,
        hours: 0,
        approved: 0,
      };
      existing.hours += ts.totalHours;
      if (ts.status === "Approved") existing.approved += ts.totalHours;
      map.set(ts.employeeUID, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [timesheets]);

  const hoursByProject = useMemo(() => {
    const map = new Map<string, { project: string; client: string; hours: number; timesheets: number }>();
    timesheets.forEach((ts) => {
      const key = `${ts.project}|${ts.client}`;
      const existing = map.get(key) || {
        project: ts.project,
        client: ts.client,
        hours: 0,
        timesheets: 0,
      };
      existing.hours += ts.totalHours;
      if (ts.status === "Submitted" || ts.status === "Approved") existing.timesheets += 1;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [timesheets]);

  const timesheetStatusSummary = useMemo(() => {
    return [
      { status: "Draft", count: timesheets.filter((ts) => ts.status === "Draft").length, color: "bg-slate-100 text-slate-700" },
      { status: "Submitted", count: timesheets.filter((ts) => ts.status === "Submitted").length, color: "bg-orange-100 text-orange-700" },
      { status: "Approved", count: timesheets.filter((ts) => ts.status === "Approved").length, color: "bg-green-100 text-green-700" },
      { status: "Rejected", count: timesheets.filter((ts) => ts.status === "Rejected").length, color: "bg-red-100 text-red-700" },
    ];
  }, [timesheets]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <InternalAccessBanner area="admin" />

        <div>
          <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">Reports</h1>
          <p className="mt-1 text-slate-600">Internal operations summary and analytics.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{stat.value}</p>
                  </div>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Hours by Employee</h2>
            <p className="mt-1 text-xs text-slate-600">Total and approved hours per employee.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-2 font-semibold">UID</th>
                    <th className="py-2 font-semibold">Employee</th>
                    <th className="py-2 font-semibold text-right">Total Hours</th>
                    <th className="py-2 font-semibold text-right">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursByEmployee.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        No timesheet data.
                      </td>
                    </tr>
                  ) : (
                    hoursByEmployee.map((row) => (
                      <tr key={row.uid} className="border-b border-[#E5E7EB]/80">
                        <td className="py-3">
                          <span className="font-mono text-xs font-semibold text-[#1DA1F2]">{row.uid}</span>
                        </td>
                        <td className="py-3 text-slate-900">{row.name}</td>
                        <td className="py-3 text-right font-semibold text-[#0B3D91]">{row.hours}</td>
                        <td className="py-3 text-right font-semibold text-green-600">{row.approved}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Hours by Project</h2>
            <p className="mt-1 text-xs text-slate-600">Hours allocated per project and client.</p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[#0B3D91]">
                    <th className="py-2 font-semibold">Project</th>
                    <th className="py-2 font-semibold">Client</th>
                    <th className="py-2 font-semibold text-right">Hours</th>
                    <th className="py-2 font-semibold text-right">Timesheets</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursByProject.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        No project data.
                      </td>
                    </tr>
                  ) : (
                    hoursByProject.map((row) => (
                      <tr key={`${row.project}|${row.client}`} className="border-b border-[#E5E7EB]/80">
                        <td className="py-3 font-medium text-slate-900">{row.project}</td>
                        <td className="py-3 text-slate-700">{row.client || "-"}</td>
                        <td className="py-3 text-right font-semibold text-[#0B3D91]">{row.hours}</td>
                        <td className="py-3 text-right font-semibold text-slate-600">{row.timesheets}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Timesheet Status Summary</h2>
          <p className="mt-1 text-xs text-slate-600">Overview of all timesheets by status.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {timesheetStatusSummary.map((item) => (
              <div key={item.status} className="rounded-lg border border-[#E5E7EB] bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">{item.status}</p>
                <p className={`mt-2 text-3xl font-bold ${item.color}`}>{item.count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-heading font-bold text-[#0B3D91] flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Active Hours
          </h2>
          <p className="mt-1 text-xs text-slate-600">Approved hours submitted this week.</p>

          <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-slate-50 p-6">
            <div className="text-4xl font-bold text-[#0B3D91]">
              {timesheets
                .filter((ts) => {
                  const now = new Date();
                  const weekStart = new Date(now);
                  weekStart.setDate(now.getDate() - now.getDay());
                  weekStart.setHours(0, 0, 0, 0);

                  const tsStart = new Date(ts.weekStartDate);
                  return tsStart >= weekStart && ts.status === "Approved";
                })
                .reduce((sum, ts) => sum + ts.totalHours, 0)}
            </div>
            <p className="mt-2 text-slate-600">hours this week</p>
          </div>
        </section>
      </section>
    </main>
  );
}
