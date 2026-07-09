import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, Briefcase, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";
import { InternalAccessBanner } from "@/components/InternalAccessBanner";
import { readEmployees, getActiveEmployees } from "@/lib/employees";
import { readTimesheets, getPendingTimesheets } from "@/lib/timesheets";
import { getPublishedJobRequirements, readJobRequirements } from "@/lib/jobs";
import { readEmployerRequirements } from "@/lib/employer-requirements";
import { readClientRequirements } from "@/lib/client-requirements";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const location = useLocation();
  const employees = readEmployees();
  const activeEmployees = getActiveEmployees();
  const timesheets = readTimesheets();
  const pendingTimesheets = getPendingTimesheets();
  const approvedTimesheets = timesheets.filter((ts) => ts.status === "Approved");
  const jobs = readJobRequirements();
  const publishedJobs = getPublishedJobRequirements(jobs);
  const employerRequirements = readEmployerRequirements();
  const clientRequirements = readClientRequirements();

  const totalEmployers = new Set(
    employerRequirements.map((item) => item.employerName.trim()).filter(Boolean),
  ).size;
  const totalClients = new Set(
    clientRequirements.map((item) => item.clientName.trim()).filter(Boolean),
  ).size;

  const stats = useMemo(
    () => [
      {
        label: "Total Job Requirements",
        value: jobs.length,
        icon: Briefcase,
        color: "bg-[#1DA1F2]",
      },
      {
        label: "Published Jobs",
        value: publishedJobs.length,
        icon: Briefcase,
        color: "bg-green-600",
      },
      {
        label: "Draft Jobs",
        value: jobs.filter((j) => j.status === "Draft").length,
        icon: Briefcase,
        color: "bg-slate-500",
      },
      {
        label: "Closed Jobs",
        value: jobs.filter((j) => j.status === "Closed").length,
        icon: Briefcase,
        color: "bg-red-600",
      },
      { label: "Total Employees", value: employees.length, icon: Users, color: "bg-[#0B3D91]" },
      { label: "Total Employers", value: totalEmployers, icon: Users, color: "bg-indigo-600" },
      { label: "Total Clients", value: totalClients, icon: Users, color: "bg-cyan-600" },
      {
        label: "Active Employees",
        value: activeEmployees.length,
        icon: Users,
        color: "bg-emerald-600",
      },
      {
        label: "Pending Timesheets",
        value: pendingTimesheets.length,
        icon: Clock,
        color: "bg-orange-500",
      },
      {
        label: "Approved Timesheets",
        value: approvedTimesheets.length,
        icon: Clock,
        color: "bg-blue-600",
      },
    ],
    [
      jobs,
      publishedJobs,
      employees,
      totalEmployers,
      totalClients,
      activeEmployees,
      pendingTimesheets,
      approvedTimesheets,
    ],
  );

  const totalHoursThisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return timesheets
      .filter((ts) => {
        const tsStart = new Date(ts.weekStartDate);
        return tsStart >= weekStart && ts.status === "Approved";
      })
      .reduce((sum, ts) => sum + ts.totalHours, 0);
  }, [timesheets]);

  if (location.pathname !== "/admin") {
    return <Outlet />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <AdminNav />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <InternalAccessBanner area="admin" />

        <div>
          <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">Dashboard</h1>
          <p className="mt-1 text-slate-600">Overview of SDS operations and key metrics.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{stat.value}</p>
                  </div>
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} text-white`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card href="/admin/jobs?action=new" label="Post New Job" icon={Briefcase} />
          <Card href="/admin/employees?action=new" label="Add Employee" icon={Users} />
          <Card href="/employer/jobs" label="Add Employer" icon={Users} />
          <Card href="/client/requirements" label="Add Client" icon={Users} />
          <Card href="/admin/timesheets" label="Review Timesheets" icon={Clock} />
          <Card href="/admin/reports" label="View Reports" icon={TrendingUp} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Recent Employees</h2>
            <div className="mt-4 space-y-3">
              {employees.slice(0, 5).length === 0 ? (
                <p className="text-sm text-slate-500">No employees added yet.</p>
              ) : (
                employees.slice(0, 5).map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{emp.fullName}</p>
                      <p className="text-xs text-slate-500">{emp.uid}</p>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${emp.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}
                    >
                      {emp.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              to="/admin/employees"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1DA1F2] hover:gap-3 transition-all"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-heading font-bold text-[#0B3D91]">Pending Timesheets</h2>
            <div className="mt-4 space-y-3">
              {pendingTimesheets.slice(0, 5).length === 0 ? (
                <p className="text-sm text-slate-500">No pending timesheets.</p>
              ) : (
                pendingTimesheets.slice(0, 5).map((ts) => (
                  <div
                    key={ts.id}
                    className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{ts.employeeName}</p>
                      <p className="text-xs text-slate-500">{ts.totalHours} hours</p>
                    </div>
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                      Submitted
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link
              to="/admin/timesheets"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1DA1F2] hover:gap-3 transition-all"
            >
              Review all <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}

function Card({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md hover:border-[#1DA1F2] transition-all group"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DA1F2]/15 text-[#0B3D91] group-hover:bg-[#1DA1F2] group-hover:text-white transition-colors">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-medium text-slate-900 group-hover:text-[#0B3D91]">{label}</p>
      <p className="mt-1 text-xs text-slate-500">Quick action</p>
    </Link>
  );
}
