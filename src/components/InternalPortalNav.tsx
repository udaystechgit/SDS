import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/lib/auth-context";

export type InternalPortalType = "admin" | "employer" | "client" | "employee";

type PortalLink = {
  to: string;
  label: string;
  disabled?: boolean;
};

const LINKS: Record<InternalPortalType, PortalLink[]> = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/jobs", label: "Jobs" },
    { to: "/admin/employees", label: "Employees" },
    { to: "/admin/timesheets", label: "Timesheets" },
    { to: "/admin/reports", label: "Reports" },
  ],
  employer: [
    { to: "/employer", label: "Dashboard" },
    { to: "/employer/jobs", label: "Jobs" },
    { to: "/employer/candidates", label: "Candidates" },
    { to: "/employer/timesheets", label: "Timesheets" },
    { to: "/employer/reports", label: "Reports" },
  ],
  client: [
    { to: "/client", label: "Dashboard" },
    { to: "/client/requirements", label: "Requirements" },
    { to: "/client/resources", label: "Resources" },
    { to: "/client/timesheets", label: "Timesheets" },
    { to: "/client/invoices", label: "Invoices" },
  ],
  employee: [
    { to: "/employee", label: "Dashboard" },
    { to: "/employee/profile", label: "Profile" },
    { to: "/employee/timesheets", label: "Timesheets" },
    { to: "/employee/leave", label: "Leave" },
    { to: "/employee/documents", label: "Documents" },
    { to: "/employee/payroll", label: "Payroll", disabled: true },
    { to: "/employee/benefits", label: "Benefits", disabled: true },
    { to: "/employee/training", label: "Training", disabled: true },
    { to: "/employee/settings", label: "Settings", disabled: true },
  ],
};

export function InternalPortalNav({ portal }: { portal: InternalPortalType }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const links = LINKS[portal];

  async function onLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <div className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            if (link.disabled) {
              return (
                <span
                  key={link.to}
                  aria-disabled="true"
                  className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-400"
                  title="Coming Soon"
                >
                  {link.label}
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Coming Soon
                  </span>
                </span>
              );
            }

            const isActive =
              location.pathname === link.to ||
              (link.to !== `/${portal}` && location.pathname.startsWith(link.to));

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#1DA1F2]/15 text-[#0B3D91]"
                    : "text-slate-600 hover:text-[#0B3D91]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="ml-auto">
            <NotificationBell />
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:text-[#0B3D91]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
