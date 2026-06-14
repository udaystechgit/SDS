import type { AppRole } from "@/lib/auth-roles";

export type RouteAccessMeta = {
  public: boolean;
  allowedRoles?: AppRole[];
};

export const ROUTE_ACCESS_META: Record<string, RouteAccessMeta> = {
  "/": {
    public: true,
  },
  "/about": {
    public: true,
  },
  "/services": {
    public: true,
  },
  "/careers": {
    public: true,
  },
  "/contact": {
    public: true,
  },
  "/login": {
    public: true,
  },
  "/admin": {
    public: false,
    allowedRoles: ["admin", "staff"],
  },
  "/admin/jobs": {
    public: false,
    allowedRoles: ["admin", "staff"],
  },
  "/admin/employees": {
    public: false,
    allowedRoles: ["admin", "staff"],
  },
  "/admin/timesheets": {
    public: false,
    allowedRoles: ["admin", "staff"],
  },
  "/admin/reports": {
    public: false,
    allowedRoles: ["admin", "staff"],
  },
  "/employer": {
    public: false,
    allowedRoles: ["employer"],
  },
  "/employer/jobs": {
    public: false,
    allowedRoles: ["employer"],
  },
  "/employer/candidates": {
    public: false,
    allowedRoles: ["employer"],
  },
  "/employer/timesheets": {
    public: false,
    allowedRoles: ["employer"],
  },
  "/employer/reports": {
    public: false,
    allowedRoles: ["employer"],
  },
  "/client": {
    public: false,
    allowedRoles: ["client"],
  },
  "/client/requirements": {
    public: false,
    allowedRoles: ["client"],
  },
  "/client/resources": {
    public: false,
    allowedRoles: ["client"],
  },
  "/client/timesheets": {
    public: false,
    allowedRoles: ["client"],
  },
  "/client/invoices": {
    public: false,
    allowedRoles: ["client"],
  },
  "/employee": {
    public: false,
    allowedRoles: ["employee"],
  },
};

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return `/${pathname.replace(/^\/+|\/+$/g, "")}`;
}

export function getRouteAccessMeta(pathname: string): RouteAccessMeta | undefined {
  const normalizedPathname = normalizePathname(pathname);
  const exactMatch = ROUTE_ACCESS_META[normalizedPathname];

  if (exactMatch) {
    return exactMatch;
  }

  if (normalizedPathname.startsWith("/admin/employees/")) {
    return ROUTE_ACCESS_META["/admin/employees"];
  }

  return undefined;
}
