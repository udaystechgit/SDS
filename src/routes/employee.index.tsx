import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, CalendarDays, Clock3, FileText, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getEmployeeDashboardFn, type EmployeeDashboardData } from "@/lib/api/employee.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/employee/")({
  component: EmployeeDashboardPage,
});

const quickActions = [
  {
    to: "/employee/profile",
    title: "Go to Profile",
    description: "Review your personal, employment, and assignment details.",
    icon: UserRound,
  },
  {
    to: "/employee/timesheets",
    title: "Submit Timesheet",
    description: "Create or review weekly time entries.",
    icon: Clock3,
  },
  {
    to: "/employee/leave",
    title: "Request Leave",
    description: "Check balances and submit time-off requests.",
    icon: CalendarDays,
  },
  {
    to: "/employee/documents",
    title: "View Documents",
    description: "Access employment documents and payroll records.",
    icon: FileText,
  },
] as const;

function EmployeeDashboardPage() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (!session?.access_token) {
          throw new Error("Authentication is required.");
        }

        const data = await getEmployeeDashboardFn({
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (mounted) {
          setDashboard(data);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load employee dashboard.",
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  const summaryCards = useMemo(
    () =>
      dashboard
        ? [
            {
              label: "Pending Timesheets",
              value: dashboard.pendingTimesheets.toString(),
              icon: Clock3,
              color: "bg-orange-500",
            },
            {
              label: "Approved Timesheets",
              value: dashboard.approvedTimesheets.toString(),
              icon: Clock3,
              color: "bg-green-600",
            },
            {
              label: "Leave Balance",
              value: `${dashboard.leaveBalance} days`,
              icon: CalendarDays,
              color: "bg-[#1DA1F2]",
            },
            {
              label: "Active Assignments",
              value: dashboard.activeAssignments.toString(),
              icon: Briefcase,
              color: "bg-[#0B3D91]",
            },
          ]
        : [],
    [dashboard],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
          Employee Workspace
        </p>
        <h1 className="text-3xl font-heading font-bold text-[#0B3D91]">Employee Dashboard</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          View your work summary, manage timesheets, request leave, and access documents.
        </p>
      </div>

      {isLoading ? (
        <StatusPanel message="Loading employee dashboard..." />
      ) : errorMessage ? (
        <StatusPanel message={errorMessage} tone="error" />
      ) : !dashboard ? (
        <StatusPanel message="Employee dashboard data is unavailable." tone="error" />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <section
                  key={card.label}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-600">{card.label}</p>
                      <p className="mt-2 text-3xl font-bold text-[#0B3D91]">{card.value}</p>
                    </div>
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color} text-white`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Quick Actions</h2>
                <p className="mt-1 text-sm text-slate-600">Common employee self-service tasks.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-[#1DA1F2] hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1DA1F2]/10 text-[#0B3D91] transition group-hover:bg-[#1DA1F2] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-semibold text-slate-900 group-hover:text-[#0B3D91]">
                      {action.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-heading font-bold text-[#0B3D91]">Today</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <InfoBlock label="Current Assignment" value={dashboard.currentAssignment} />
              <InfoBlock label="Manager" value={dashboard.managerName} />
              <InfoBlock label="Next Due" value={dashboard.nextDue} />
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function StatusPanel({
  message,
  tone = "default",
}: {
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={`mt-8 rounded-2xl border p-5 text-sm font-medium ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[#E5E7EB] bg-white text-[#0B3D91]"
      }`}
    >
      {message}
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
