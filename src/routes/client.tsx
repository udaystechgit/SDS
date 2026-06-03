import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { ClipboardList, Users, Clock3, Receipt, ArrowRight } from "lucide-react";
import { InternalPortalNav } from "@/components/InternalPortalNav";
import { PortalBanner } from "@/components/PortalBanner";
import { readClientRequirements } from "@/lib/client-requirements";
import { readEmployees } from "@/lib/employees";
import { readTimesheets } from "@/lib/timesheets";
import { readInvoices } from "@/lib/invoices";

export const Route = createFileRoute("/client")({
  component: ClientDashboardPage,
});

function ClientDashboardPage() {
  const location = useLocation();
  const requirements = readClientRequirements();
  const employees = readEmployees();
  const timesheets = readTimesheets();
  const invoices = readInvoices();

  const totalHoursThisMonth = useMemo(() => {
    const now = new Date();
    return timesheets
      .filter((ts) => {
        const tsDate = new Date(ts.weekStartDate);
        return tsDate.getMonth() === now.getMonth() && tsDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, ts) => sum + ts.totalHours, 0);
  }, [timesheets]);

  const cards = [
    {
      label: "Open Service Requirements",
      value: requirements.filter((r) => ["Submitted", "Under Review", "Approved", "In Progress"].includes(r.status)).length,
      icon: ClipboardList,
    },
    {
      label: "Assigned Resources",
      value: employees.filter((e) => e.status === "Active").length,
      icon: Users,
    },
    {
      label: "Pending Timesheets",
      value: timesheets.filter((t) => t.status === "Submitted" && t.clientApprovalStatus === "Pending").length,
      icon: Clock3,
    },
    {
      label: "Approved Timesheets",
      value: timesheets.filter((t) => t.clientApprovalStatus === "Approved").length,
      icon: Clock3,
    },
    {
      label: "Open Invoices",
      value: invoices.filter((i) => ["Draft", "Sent", "Overdue"].includes(i.status)).length,
      icon: Receipt,
    },
    {
      label: "Total Hours This Month",
      value: totalHoursThisMonth,
      icon: Clock3,
    },
  ];

  if (location.pathname !== "/client") {
    return <Outlet />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <InternalPortalNav portal="client" />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PortalBanner extraMessage="Client login and secure billing access will be added in backend phase." />

        <div>
          <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">Client Dashboard</h1>
          <p className="mt-1 text-slate-600">Submit requirements, review resources, approve timesheets, and monitor invoices.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{card.value}</p>
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
          <QuickLink to="/client/requirements" title="Submit Requirements" />
          <QuickLink to="/client/resources" title="View Resources" />
          <QuickLink to="/client/timesheets" title="Review Timesheets" />
          <QuickLink to="/client/invoices" title="View Invoices" />
        </div>
      </section>
    </main>
  );
}

function QuickLink({ to, title }: { to: string; title: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm font-semibold text-[#0B3D91]">{title}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#1DA1F2]">
        Open <ArrowRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}
