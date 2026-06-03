import { Link, useLocation } from "@tanstack/react-router";

export type InternalPortalType = "admin" | "employer" | "client";

type PortalLink = {
  to: string;
  label: string;
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
};

export function InternalPortalNav({ portal }: { portal: InternalPortalType }) {
  const location = useLocation();
  const links = LINKS[portal];

  return (
    <div className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
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
        </div>
      </div>
    </div>
  );
}
