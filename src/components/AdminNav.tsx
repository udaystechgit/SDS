import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, Clock, BarChart3, BriefcaseBusiness } from "lucide-react";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/timesheets", label: "Timesheets", icon: Clock },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AdminNav() {
  const location = useLocation();

  return (
    <div className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {adminLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-[#1DA1F2]/15 text-[#0B3D91]" }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                location.pathname === to
                  ? "bg-[#1DA1F2]/15 text-[#0B3D91]"
                  : "text-slate-600 hover:text-[#0B3D91]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
