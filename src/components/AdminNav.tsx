import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Mail,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/NotificationBell";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/contacts", label: "Contacts", icon: Mail },
  { to: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/timesheets", label: "Timesheets", icon: Clock },
  { to: "/admin/leave", label: "Leave", icon: CalendarDays },
  { to: "/admin/activity", label: "Activity", icon: ClipboardList },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AdminNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function onLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

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
