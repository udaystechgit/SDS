import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import { readEmployees } from "@/lib/employees";
import { readTimesheets } from "@/lib/timesheets";

export const Route = createFileRoute("/employer/reports")({
  component: EmployerReportsPage,
});

function EmployerReportsPage() {
  const employees = readEmployees();
  const timesheets = readTimesheets();

  const hoursByResource = useMemo(() => {
    const map = new Map<string, { uid: string; name: string; hours: number }>();
    timesheets.forEach((ts) => {
      const existing = map.get(ts.employeeUID) || {
        uid: ts.employeeUID,
        name: ts.employeeName,
        hours: 0,
      };
      existing.hours += ts.totalHours;
      map.set(ts.employeeUID, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [timesheets]);

  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>();
    timesheets.forEach((ts) => {
      map.set(ts.project, (map.get(ts.project) || 0) + ts.totalHours);
    });
    return Array.from(map.entries()).map(([project, hours]) => ({ project, hours }));
  }, [timesheets]);

  const activeResources = employees.filter((e) => e.status === "Active").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="employer" />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PortalBanner extraMessage="Employer access protection will be added in backend phase." />

        <div>
          <h1 className="text-2xl font-heading font-bold text-[#0B3D91]">Employer Reports</h1>
          <p className="mt-1 text-slate-600">
            Hours by resource, project, and timesheet status insights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Stat title="Active Resource Count" value={activeResources} />
          <Stat
            title="Submitted Timesheets"
            value={timesheets.filter((t) => t.status === "Submitted").length}
          />
          <Stat
            title="Approved Timesheets"
            value={timesheets.filter((t) => t.status === "Approved").length}
          />
          <Stat
            title="Rejected Timesheets"
            value={timesheets.filter((t) => t.status === "Rejected").length}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Hours by Resource</h2>
            <div className="mt-3 space-y-2">
              {hoursByResource.length === 0 ? (
                <p className="text-sm text-slate-500">No data available.</p>
              ) : (
                hoursByResource.map((row) => (
                  <div
                    key={row.uid}
                    className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.uid}</p>
                    </div>
                    <p className="text-sm font-bold text-[#0B3D91]">{row.hours} hrs</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Hours by Project</h2>
            <div className="mt-3 space-y-2">
              {hoursByProject.length === 0 ? (
                <p className="text-sm text-slate-500">No data available.</p>
              ) : (
                hoursByProject.map((row) => (
                  <div
                    key={row.project}
                    className="flex items-center justify-between rounded-lg border border-[#E5E7EB] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {row.project || "Unassigned"}
                    </p>
                    <p className="text-sm font-bold text-[#0B3D91]">{row.hours} hrs</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{value}</p>
    </div>
  );
}
