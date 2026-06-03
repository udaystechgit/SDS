export type RouteVisibility = "public" | "admin" | "employee" | "employer" | "client";

export type AppRole = "Admin" | "Employee" | "Employer" | "Client" | "Recruiter";

export interface RouteAccessMeta {
  path: string;
  visibility: RouteVisibility;
  futureAllowedRoles: AppRole[];
  requiresAuthInPhase2: boolean;
}

// Phase 1: metadata-only planning structure. No runtime auth enforcement yet.
export const ROUTE_ACCESS_META: RouteAccessMeta[] = [
  {
    path: "/",
    visibility: "public",
    futureAllowedRoles: ["Admin", "Employee", "Employer", "Client", "Recruiter"],
    requiresAuthInPhase2: false,
  },
  {
    path: "/about",
    visibility: "public",
    futureAllowedRoles: ["Admin", "Employee", "Employer", "Client", "Recruiter"],
    requiresAuthInPhase2: false,
  },
  {
    path: "/services",
    visibility: "public",
    futureAllowedRoles: ["Admin", "Employee", "Employer", "Client", "Recruiter"],
    requiresAuthInPhase2: false,
  },
  {
    path: "/careers",
    visibility: "public",
    futureAllowedRoles: ["Admin", "Employee", "Employer", "Client", "Recruiter"],
    requiresAuthInPhase2: false,
  },
  {
    path: "/contact",
    visibility: "public",
    futureAllowedRoles: ["Admin", "Employee", "Employer", "Client", "Recruiter"],
    requiresAuthInPhase2: false,
  },
  {
    path: "/employee",
    visibility: "employee",
    futureAllowedRoles: ["Employee"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/admin",
    visibility: "admin",
    futureAllowedRoles: ["Admin", "Recruiter"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/admin/jobs",
    visibility: "admin",
    futureAllowedRoles: ["Admin", "Recruiter"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/admin/employees",
    visibility: "admin",
    futureAllowedRoles: ["Admin", "Recruiter"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/admin/employees/:id",
    visibility: "admin",
    futureAllowedRoles: ["Admin", "Recruiter"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/admin/timesheets",
    visibility: "admin",
    futureAllowedRoles: ["Admin", "Recruiter"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/admin/reports",
    visibility: "admin",
    futureAllowedRoles: ["Admin", "Recruiter"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/employer",
    visibility: "employer",
    futureAllowedRoles: ["Employer"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/employer/jobs",
    visibility: "employer",
    futureAllowedRoles: ["Employer"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/employer/candidates",
    visibility: "employer",
    futureAllowedRoles: ["Employer"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/employer/timesheets",
    visibility: "employer",
    futureAllowedRoles: ["Employer"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/employer/reports",
    visibility: "employer",
    futureAllowedRoles: ["Employer"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/client",
    visibility: "client",
    futureAllowedRoles: ["Client"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/client/requirements",
    visibility: "client",
    futureAllowedRoles: ["Client"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/client/resources",
    visibility: "client",
    futureAllowedRoles: ["Client"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/client/timesheets",
    visibility: "client",
    futureAllowedRoles: ["Client"],
    requiresAuthInPhase2: true,
  },
  {
    path: "/client/invoices",
    visibility: "client",
    futureAllowedRoles: ["Client"],
    requiresAuthInPhase2: true,
  },
];

export function getRouteAccessMeta(pathname: string): RouteAccessMeta | undefined {
  return ROUTE_ACCESS_META.find((meta) => {
    if (meta.path === pathname) return true;

    // Minimal dynamic support for planned patterns like /admin/employees/:id
    if (meta.path.includes(":id") && pathname.startsWith(meta.path.replace(":id", ""))) {
      return true;
    }

    return false;
  });
}
