import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { BriefcaseBusiness, Users, Clock3, CheckCircle2, ArrowRight } from "lucide-react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import { readEmployerRequirements } from "@/lib/employer-requirements";
import { readEmployees } from "@/lib/employees";
import { readTimesheets } from "@/lib/timesheets";

export const Route = createFileRoute("/employer")({
  component: EmployerDashboardPage,
});

function EmployerDashboardPage() {
  const location = useLocation();
  const requirements = readEmployerRequirements();
  const employees = readEmployees();
  const timesheets = readTimesheets();

  const stats = useMemo(
    () => [
      {
        label: "Open Requirements",
        value: requirements.filter((r) =>
          ["Submitted", "Approved by Admin", "Published"].includes(r.status),
        ).length,
        icon: BriefcaseBusiness,
      },
      {
        label: "Submitted Candidates",
        value: employees.filter((e) => e.status === "On Hold").length,
        icon: Users,
      },
      {
        label: "Active Resources",
        value: employees.filter((e) => e.status === "Active").length,
        icon: Users,
      },
      {
        label: "Pending Timesheets",
        value: timesheets.filter(
          (t) => t.status === "Submitted" && t.employerApprovalStatus === "Pending",
        ).length,
        icon: Clock3,
      },
      {
        label: "Approved Timesheets",
        value: timesheets.filter((t) => t.employerApprovalStatus === "Approved").length,
        icon: CheckCircle2,
      },
    ],
    [requirements, employees, timesheets],
  );

  if (location.pathname !== "/employer") {
    return <Outlet />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="employer" />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PortalBanner extraMessage="Employer access protection will be added in backend phase." />

        <div>
          <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">Employer Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Track requirements, resources, and timesheets for employer operations.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{stat.value}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DA1F2]/15 text-[#0B3D91]">
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/employer/jobs" title="Manage Job Requirements" />
          <QuickLink to="/employer/candidates" title="Review Candidates" />
          <QuickLink to="/employer/timesheets" title="Review Timesheets" />
          <QuickLink to="/employer/reports" title="View Reports" />
        </div>
      </section>
    </main>
  );
}

function QuickLink({ to, title }: { to: string; title: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-semibold text-[#0B3D91]">{title}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#1DA1F2]">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}
